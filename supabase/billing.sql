-- ═════════════════════════ v3: підписки й обмеження тарифів ═════════════════════════
-- Тарифи як на лендингу: Start / Pro / Business / Enterprise + 14 днів пробного періоду.
-- Тариф і «оплачено до» змінює лише власник сервісу (Supabase → Table Editor → organizations),
-- користувачі можуть тільки надіслати запит на тариф. Повторний запуск безпечний.

alter table public.organizations add column if not exists plan_intent    text check (plan_intent in ('start','pro','business','enterprise'));
alter table public.organizations add column if not exists billing_period text not null default 'month' check (billing_period in ('month','year'));
alter table public.organizations add column if not exists paid_until     timestamptz;

-- Користувач не може сам змінити тариф, строк тріалу, період оплати чи «оплачено до»
create or replace function public.protect_billing_fields()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if (select auth.role()) = 'authenticated' then
    new.plan := old.plan;
    new.trial_ends_at := old.trial_ends_at;
    new.billing_period := old.billing_period;
    new.paid_until := old.paid_until;
  end if;
  return new;
end; $$;

-- Ліміти кожного тарифу (одне джерело правди для бази й застосунку)
create or replace function public.plan_limits(p_plan text)
returns jsonb language sql immutable set search_path = ''
as $$
  select case p_plan
    when 'start'      then '{"seats":2,  "markets":1, "library":false, "analytics":false, "notes":false, "docs":0}'
    when 'pro'        then '{"seats":5,  "markets":2, "library":true,  "analytics":true,  "notes":true,  "docs":300}'
    when 'business'   then '{"seats":15, "markets":2, "library":true,  "analytics":true,  "notes":true,  "docs":2000}'
    when 'enterprise' then '{"seats":200,"markets":2, "library":true,  "analytics":true,  "notes":true,  "docs":20000}'
    when 'trial'      then '{"seats":5,  "markets":2, "library":true,  "analytics":true,  "notes":true,  "docs":100}'
    else                   '{"seats":0,  "markets":0, "library":false, "analytics":false, "notes":false, "docs":0}'
  end::jsonb
$$;

-- Чинний тариф з урахуванням строків: тріал минув або оплата прострочена (3 дні пільги) → expired
create or replace function public.org_effective_plan(p_org uuid)
returns text language sql stable security definer set search_path = ''
as $$
  select case
    when o.plan = 'trial' and o.trial_ends_at < now() then 'expired'
    when o.plan <> 'trial' and o.paid_until is not null and o.paid_until < now() - interval '3 days' then 'expired'
    else o.plan end
  from public.organizations o where o.id = p_org
$$;
revoke execute on function public.org_effective_plan(uuid) from anon, public;

-- Стан підписки для застосунку: тариф, ліміти, використання
create or replace function public.org_subscription(p_org uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare v_plan text; v_eff text;
begin
  if not public.is_org_member(p_org) then raise exception 'not a member'; end if;
  select plan into v_plan from public.organizations where id = p_org;
  v_eff := public.org_effective_plan(p_org);
  return jsonb_build_object(
    'plan', v_plan, 'effective', v_eff,
    'limits', public.plan_limits(case when v_eff = 'expired' then 'expired' else v_plan end),
    'usage', jsonb_build_object(
      'members', (select count(*) from public.organization_members where org_id = p_org),
      'invites', (select count(*) from public.invitations where org_id = p_org),
      'docs',    (select count(*) from public.documents where org_id = p_org)),
    'request', (select jsonb_build_object('plan', r.plan, 'period', r.period, 'created_at', r.created_at)
                from public.plan_requests r where r.org_id = p_org and r.status = 'new' order by r.created_at desc limit 1));
end; $$;

-- Запити на тариф: оплата без автосписань — ми зв'язуємось і виставляємо рахунок
create table if not exists public.plan_requests (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations (id) on delete cascade,
  plan         text not null check (plan in ('start','pro','business','enterprise')),
  period       text not null default 'month' check (period in ('month','year')),
  note         text check (char_length(note) <= 500),
  requested_by uuid default auth.uid() references auth.users (id) on delete set null,
  status       text not null default 'new' check (status in ('new','done','cancelled')),
  created_at   timestamptz not null default now()
);
create index if not exists plan_requests_org_idx on public.plan_requests (org_id, created_at desc);
alter table public.plan_requests enable row level security;
drop policy if exists "members read plan requests" on public.plan_requests;
drop policy if exists "admins request plan"       on public.plan_requests;
create policy "members read plan requests" on public.plan_requests for select to authenticated using ((select public.is_org_member(org_id)));
create policy "admins request plan" on public.plan_requests for insert to authenticated
  with check ((select public.is_org_admin(org_id)) and requested_by = (select auth.uid()) and status = 'new');
revoke all on public.plan_requests from anon;
grant select, insert on public.plan_requests to authenticated;
grant execute on function public.org_subscription(uuid) to authenticated;
revoke execute on function public.org_subscription(uuid) from anon, public;

-- ───────── Обмеження, які діють на рівні бази (їх не обійти з браузера) ─────────
-- Місця в команді: учасники + запрошення не більше ліміту тарифу
create or replace function public.enforce_seats()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_eff text; v_lim int; v_used int;
begin
  v_eff := public.org_effective_plan(new.org_id);
  if v_eff = 'expired' then raise exception 'plan_expired' using hint = 'Підписка неактивна'; end if;
  v_lim := (public.plan_limits(v_eff)->>'seats')::int;
  v_used := (select count(*) from public.organization_members where org_id = new.org_id)
          + (select count(*) from public.invitations where org_id = new.org_id);
  if v_used >= v_lim then raise exception 'seat_limit' using hint = format('Ліміт тарифу: %s користувачів', v_lim); end if;
  return new;
end; $$;
drop trigger if exists invitations_seats on public.invitations;
create trigger invitations_seats before insert on public.invitations for each row execute function public.enforce_seats();

-- Бібліотека документів: лише на тарифах з бібліотекою і в межах ліміту файлів
create or replace function public.enforce_documents()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_eff text; v_l jsonb;
begin
  v_eff := public.org_effective_plan(new.org_id);
  if v_eff = 'expired' then raise exception 'plan_expired'; end if;
  v_l := public.plan_limits(v_eff);
  if not (v_l->>'library')::boolean then raise exception 'plan_no_library'; end if;
  if (select count(*) from public.documents where org_id = new.org_id) >= (v_l->>'docs')::int then raise exception 'doc_limit'; end if;
  return new;
end; $$;
drop trigger if exists documents_limits on public.documents;
create trigger documents_limits before insert on public.documents for each row execute function public.enforce_documents();

-- Після завершення підписки робочий стан доступний лише для читання
create or replace function public.enforce_active_state()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if (select auth.role()) = 'authenticated' and public.org_effective_plan(new.org_id) = 'expired' then raise exception 'plan_expired'; end if;
  return new;
end; $$;
drop trigger if exists org_state_active on public.org_state;
create trigger org_state_active before update on public.org_state for each row execute function public.enforce_active_state();

revoke execute on function public.enforce_seats(), public.enforce_documents(), public.enforce_active_state() from anon, authenticated, public;

-- Обраний при реєстрації тариф (?plan=…) запам'ятовуємо як намір
create or replace function public.remember_plan_intent()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v text;
begin
  select u.raw_user_meta_data->>'plan_intent' into v from auth.users u where u.id = new.user_id;
  if new.role = 'owner' and v in ('start','pro','business','enterprise') then
    update public.organizations set plan_intent = v where id = new.org_id and plan_intent is null;
  end if;
  return new;
end; $$;
drop trigger if exists members_plan_intent on public.organization_members;
create trigger members_plan_intent after insert on public.organization_members for each row execute function public.remember_plan_intent();
revoke execute on function public.remember_plan_intent() from anon, authenticated, public;

update public.organizations o set plan_intent = u.raw_user_meta_data->>'plan_intent'
from public.organization_members m join auth.users u on u.id = m.user_id
where m.org_id = o.id and m.role = 'owner' and o.plan_intent is null
  and u.raw_user_meta_data->>'plan_intent' in ('start','pro','business','enterprise');

notify pgrst, 'reload schema';

-- Tendera — схема бази для реєстрації бізнесу (Supabase / Postgres)
-- Запустіть цей файл один раз у Supabase → SQL Editor. Повторний запуск безпечний.

-- ───────────────────────── Таблиці ─────────────────────────
create table if not exists public.organizations (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (char_length(name) between 2 and 200),
  country       text not null default 'UA' check (char_length(country) = 2),
  reg_code      text check (char_length(reg_code) <= 32),
  size          text check (size in ('1-10','11-50','51-250','251-1000','1000+')),
  industries    text[] not null default '{}',
  regions       text[] not null default '{}',
  website       text check (char_length(website) <= 200),
  budget_min    numeric check (budget_min >= 0),
  budget_max    numeric check (budget_max >= 0),
  plan          text not null default 'trial' check (plan in ('trial','start','pro','business','enterprise')),
  trial_ends_at timestamptz not null default (now() + interval '14 days'),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text check (char_length(full_name) <= 120),
  job_title  text check (char_length(job_title) <= 120),
  phone      text check (char_length(phone) <= 32),
  locale     text not null default 'uk',
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  org_id     uuid not null references public.organizations (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       text not null default 'member' check (role in ('owner','admin','member')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index if not exists organization_members_user_idx on public.organization_members (user_id);
-- Зв'язок з профілем, щоб застосунок міг показати команду одним запитом
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'organization_members_profile_fk') then
    alter table public.organization_members add constraint organization_members_profile_fk foreign key (user_id) references public.profiles (id) on delete cascade;
  end if;
end $$;

-- Робочий стан компанії в застосунку: pipeline, рішення по тендерах, чекліст, чернетки
create table if not exists public.org_state (
  org_id     uuid primary key references public.organizations (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint org_state_size check (pg_column_size(data) < 1000000)
);

create table if not exists public.invitations (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations (id) on delete cascade,
  email      text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role       text not null default 'member' check (role in ('admin','member')),
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (org_id, email)
);

-- ───────────────────────── Допоміжні функції ─────────────────────────
create or replace function public.is_org_member(p_org uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.organization_members m where m.org_id = p_org and m.user_id = (select auth.uid())); $$;

create or replace function public.is_org_admin(p_org uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.organization_members m where m.org_id = p_org and m.user_id = (select auth.uid()) and m.role in ('owner','admin')); $$;

revoke execute on function public.is_org_member(uuid) from anon, public;
revoke execute on function public.is_org_admin(uuid)  from anon, public;
grant  execute on function public.is_org_member(uuid) to authenticated;
grant  execute on function public.is_org_admin(uuid)  to authenticated;

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = ''
as $$ begin new.updated_at = now(); return new; end; $$;

drop trigger if exists organizations_touch on public.organizations;
create trigger organizations_touch before update on public.organizations for each row execute function public.touch_updated_at();
drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
drop trigger if exists org_state_touch on public.org_state;
create trigger org_state_touch before update on public.org_state for each row execute function public.touch_updated_at();

-- Користувач не може сам змінити тариф чи строк тріалу
create or replace function public.protect_billing_fields()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if (select auth.role()) = 'authenticated' then
    new.plan := old.plan;
    new.trial_ends_at := old.trial_ends_at;
  end if;
  return new;
end; $$;
drop trigger if exists organizations_protect_billing on public.organizations;
create trigger organizations_protect_billing before update on public.organizations for each row execute function public.protect_billing_fields();

-- ───────────────────────── Реєстрація: компанія створюється разом з акаунтом ─────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_org uuid;
  v_name text := left(nullif(btrim(meta->>'company_name'), ''), 200);
  v_inv  record;
begin
  insert into public.profiles (id, full_name, job_title, phone, locale, marketing_opt_in)
  values (new.id,
          left(nullif(btrim(meta->>'full_name'), ''), 120),
          left(nullif(btrim(meta->>'job_title'), ''), 120),
          left(nullif(btrim(meta->>'phone'), ''), 32),
          coalesce(nullif(meta->>'locale', ''), 'uk'),
          coalesce((meta->>'marketing_opt_in')::boolean, false))
  on conflict (id) do nothing;

  -- Якщо людину запросили в компанію — додаємо в неї, а не створюємо нову
  select * into v_inv from public.invitations i where lower(i.email) = lower(new.email) order by i.created_at limit 1;
  if found then
    insert into public.organization_members (org_id, user_id, role) values (v_inv.org_id, new.id, v_inv.role) on conflict do nothing;
    delete from public.invitations where id = v_inv.id;
    return new;
  end if;

  if v_name is not null then
    insert into public.organizations (name, country, reg_code, size, industries, regions, website)
    values (v_name,
            upper(left(coalesce(nullif(meta->>'country', ''), 'UA'), 2)),
            left(nullif(regexp_replace(coalesce(meta->>'reg_code', ''), '\s', '', 'g'), ''), 32),
            case when meta->>'company_size' in ('1-10','11-50','51-250','251-1000','1000+') then meta->>'company_size' end,
            coalesce(array(select left(x, 80) from jsonb_array_elements_text(coalesce(meta->'industries', '[]'::jsonb)) as t(x) limit 20), '{}'),
            coalesce(array(select left(x, 40) from jsonb_array_elements_text(coalesce(meta->'regions', '[]'::jsonb)) as t(x) limit 20), '{}'),
            left(nullif(btrim(meta->>'website'), ''), 200))
    returning id into v_org;
    insert into public.organization_members (org_id, user_id, role) values (v_org, new.id, 'owner');
    insert into public.org_state (org_id) values (v_org);
  end if;
  return new;
end; $$;

revoke execute on function public.handle_new_user() from anon, authenticated, public;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Створити компанію пізніше (наприклад, після входу за посиланням без реєстрації)
create or replace function public.create_organization(p_name text, p_country text default 'UA', p_reg_code text default null)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_org uuid;
begin
  if (select auth.uid()) is null then raise exception 'not authenticated'; end if;
  if char_length(btrim(coalesce(p_name, ''))) < 2 then raise exception 'company name required'; end if;
  insert into public.organizations (name, country, reg_code)
  values (left(btrim(p_name), 200), upper(left(coalesce(p_country, 'UA'), 2)), left(nullif(btrim(coalesce(p_reg_code, '')), ''), 32))
  returning id into v_org;
  insert into public.organization_members (org_id, user_id, role) values (v_org, (select auth.uid()), 'owner');
  insert into public.org_state (org_id) values (v_org);
  return v_org;
end; $$;
revoke execute on function public.create_organization(text, text, text) from anon, public;
grant  execute on function public.create_organization(text, text, text) to authenticated;

-- ───────────────────────── Row Level Security ─────────────────────────
alter table public.organizations        enable row level security;
alter table public.profiles             enable row level security;
alter table public.organization_members enable row level security;
alter table public.org_state            enable row level security;
alter table public.invitations          enable row level security;

drop policy if exists "members read org"   on public.organizations;
drop policy if exists "admins update org"  on public.organizations;
create policy "members read org"  on public.organizations for select to authenticated using ((select public.is_org_member(id)));
create policy "admins update org" on public.organizations for update to authenticated using ((select public.is_org_admin(id))) with check ((select public.is_org_admin(id)));

drop policy if exists "read own or teammates profile" on public.profiles;
drop policy if exists "update own profile"            on public.profiles;
create policy "read own or teammates profile" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or exists (
    select 1 from public.organization_members me join public.organization_members them on them.org_id = me.org_id
    where me.user_id = (select auth.uid()) and them.user_id = profiles.id));
create policy "update own profile" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists "members read members" on public.organization_members;
drop policy if exists "admins remove members" on public.organization_members;
create policy "members read members"  on public.organization_members for select to authenticated using ((select public.is_org_member(org_id)));
create policy "admins remove members" on public.organization_members for delete to authenticated using ((select public.is_org_admin(org_id)) and role <> 'owner');

drop policy if exists "members read state"   on public.org_state;
drop policy if exists "members write state"  on public.org_state;
drop policy if exists "members insert state" on public.org_state;
create policy "members read state"   on public.org_state for select to authenticated using ((select public.is_org_member(org_id)));
create policy "members write state"  on public.org_state for update to authenticated using ((select public.is_org_member(org_id))) with check ((select public.is_org_member(org_id)));
create policy "members insert state" on public.org_state for insert to authenticated with check ((select public.is_org_member(org_id)));

drop policy if exists "admins read invitations"   on public.invitations;
drop policy if exists "admins create invitations" on public.invitations;
drop policy if exists "admins delete invitations" on public.invitations;
create policy "admins read invitations"   on public.invitations for select to authenticated using ((select public.is_org_admin(org_id)));
create policy "admins create invitations" on public.invitations for insert to authenticated with check ((select public.is_org_admin(org_id)) and invited_by = (select auth.uid()));
create policy "admins delete invitations" on public.invitations for delete to authenticated using ((select public.is_org_admin(org_id)));

-- Мінімальні права для ролей API
revoke all on public.organizations, public.profiles, public.organization_members, public.org_state, public.invitations from anon;
grant select, update                 on public.organizations        to authenticated;
grant select, update                 on public.profiles             to authenticated;
grant select, delete                 on public.organization_members to authenticated;
grant select, insert, update         on public.org_state            to authenticated;
grant select, insert, delete         on public.invitations          to authenticated;

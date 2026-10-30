/* Tendera — робочий простір компанії. Реальні дані: тендери з Prozorro і TED (data/*.json, оновлюються щогодини),
   акаунт, компанія, команда, pipeline і документи — у Supabase. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nf = new Intl.NumberFormat('uk-UA');
  const TAX = window.TENDERA_TAX;
  const AUTH = window.tenderaAuth;
  const MONTHS = ['січ', 'лют', 'бер', 'кві', 'тра', 'чер', 'лип', 'сер', 'вер', 'жов', 'лис', 'гру'];
  const U = id => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1600&q=80`;
  const PHOTOS = {
    works: U('1429497419816-9ca5cfb4571a'), energy: U('1615209853186-e4bd66602508'), bridge: U('1529926691761-20fb82067c71'),
    services: U('1573164574572-cb89e39749b4'), goods: U('1450101499163-c8848c66ca85'), office: U('1768101225267-c6fc5678c113'), city: U('1577450775949-58ec8d02cad9')
  };
  const STAGES = [{ id: 'new', name: 'Нові' }, { id: 'analysis', name: 'Аналіз' }, { id: 'prep', name: 'Підготовка' }, { id: 'submitted', name: 'Подано' }, { id: 'result', name: 'Результат' }];
  const ROLE_UA = { owner: 'Власник', admin: 'Адміністратор', member: 'Учасник' };
  const DOC_TYPES = ['Статутні документи', 'Довідка', 'Ліцензія / дозвіл', 'Сертифікат', 'Фінансова звітність', 'Досвід / договори', 'CV працівника', 'Інше'];

  /* ---------- formatting ---------- */
  const plural = (n, a, b, c) => { const m10 = n % 10, m100 = n % 100; if (m10 === 1 && m100 !== 11) return a; if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return b; return c; };
  const CUR = { UAH: '₴', EUR: '€', USD: '$', GBP: '£' };
  const money = (v, cur) => v == null ? 'не вказано' : (CUR[cur] ? `${CUR[cur]} ${nf.format(v)}` : `${nf.format(v)} ${cur || ''}`);
  const eurShort = v => v >= 1e9 ? '€' + (v / 1e9).toLocaleString('uk-UA', { maximumFractionDigits: 1 }) + ' млрд' : v >= 1e6 ? '€' + (v / 1e6).toLocaleString('uk-UA', { maximumFractionDigits: 1 }) + ' млн' : v >= 1e3 ? '€' + nf.format(Math.round(v / 1e3)) + ' тис.' : '€' + nf.format(Math.round(v));
  const fmtDate = d => d && !isNaN(d) ? `${d.getDate()} ${MONTHS[d.getMonth()]}` : '—';
  const fmtDateTime = d => d && !isNaN(d) ? `${fmtDate(d)}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : '—';
  const daysLeft = t => t.end ? Math.ceil((Date.parse(t.end) - Date.now()) / 864e5) : null;
  const dlCls = d => d == null ? '' : d <= 3 ? 'dl--urgent' : d <= 7 ? 'dl--soon' : '';
  const dlText = d => d == null ? 'без дедлайну' : d < 0 ? 'прийом завершено' : d === 0 ? 'сьогодні' : d === 1 ? 'завтра' : `через ${d} ${plural(d, 'день', 'дні', 'днів')}`;
  const ago = iso => { if (!iso) return ''; const m = Math.round((Date.now() - Date.parse(iso)) / 6e4); if (m < 60) return `${Math.max(1, m)} хв тому`; const h = Math.round(m / 60); if (h < 24) return `${h} год тому`; const d = Math.round(h / 24); return `${d} ${plural(d, 'день', 'дні', 'днів')} тому`; };
  const initials = n => (n || '?').trim().split(/[\s-]+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?';
  const ICON = {
    ext: '<svg viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
    down: '<svg viewBox="0 0 24 24"><path d="M12 4v12M6 10l6 6 6-6M4 20h16"/></svg>', copy: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>', doc: '<svg viewBox="0 0 24 24"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/></svg>'
  };

  /* ---------- state ---------- */
  const local = { get(k, d) { try { const v = localStorage.getItem('tendera.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } }, set(k, v) { try { localStorage.setItem('tendera.' + k, JSON.stringify(v)); } catch { /* storage unavailable */ } } };
  const S = { pipeline: {}, outcomes: {}, dismissed: {}, saved: {}, checks: {}, notes: {}, drafts: {}, snaps: {}, theme: local.get('theme', 'dark'), view: local.get('view', 'cards') };
  const SYNC = ['pipeline', 'outcomes', 'dismissed', 'saved', 'checks', 'notes', 'drafts', 'snaps'];
  let ACC = null; const DATA = { items: [], byId: new Map(), meta: null, error: null };
  document.documentElement.dataset.theme = S.theme;
  let syncTimer = 0;
  function save() {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(async () => {
      const data = Object.fromEntries(SYNC.map(k => [k, S[k]]));
      const { error } = await ACC.client.from('org_state').upsert({ org_id: ACC.org.id, data, updated_by: ACC.uid });
      if (error) toast('Не вдалося зберегти зміни. Перевірте з’єднання і повторіть дію.', 'bad');
    }, 600);
  }
  function toast(html, kind) {
    const el = document.createElement('div'); el.className = 'toast' + (kind === 'bad' ? ' toast--bad' : ''); el.innerHTML = html;
    $('#toasts').append(el); setTimeout(() => { el.style.transition = 'opacity .4s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 400); }, 4200);
  }
  document.addEventListener('error', e => { if (e.target.tagName === 'IMG') e.target.classList.add('is-broken'); }, true);

  /* ---------- profile & scoring: прозорі правила, без «чорної скриньки» ---------- */
  let P = null;
  function buildProfile(o) {
    const prefixes = [];
    (o.industries || []).forEach(name => (TAX.INDUSTRIES[name] || []).forEach(p => prefixes.push({ p, why: name })));
    (o.cpv_codes || []).forEach(c => { const p = String(c).split('-')[0].replace(/\D/g, '').replace(/0+$/, ''); if (p.length >= 2) prefixes.push({ p, why: `CPV ${c}` }); });
    return { prefixes, regions: new Set(o.regions || []), min: o.budget_min != null ? +o.budget_min : null, max: o.budget_max != null ? +o.budget_max : null,
      kw: (o.keywords || []).map(s => s.toLowerCase().trim()).filter(Boolean), ex: (o.exclude_keywords || []).map(s => s.toLowerCase().trim()).filter(Boolean), empty: !prefixes.length };
  }
  const eurOf = t => { if (t.v == null) return null; if (t.cur === 'EUR') return t.v; const r = DATA.meta && DATA.meta.rates; return r && r.toEur && r.toEur[t.cur] ? t.v * r.toEur[t.cur] : null; };
  function score(t) {
    const text = (t.t + ' ' + (t.d || '')).toLowerCase();
    if (P.ex.some(w => text.includes(w))) return { s: 0, why: [], con: ['Містить слово-виключення з вашого профілю'] };
    let s = 0; const why = [], con = []; let best = null;
    for (const c of t.cpv) for (const x of P.prefixes) if (c.startsWith(x.p) && (!best || x.p.length > best.p.length)) best = { ...x, code: c };
    if (best) { s += best.p.length >= 5 ? 60 : best.p.length >= 3 ? 52 : 45; why.push(`CPV ${best.code}${t.cpvN ? ` (${t.cpvN})` : ''} — напрям «${best.why}»`); }
    else if (!P.empty) con.push('Код CPV поза вашими напрямами');
    const regionOk = t.src === 'prozorro' ? P.regions.has('UA') : (P.regions.has('EU') || P.regions.has(t.cc));
    if (!P.regions.size) s += 10;
    else if (regionOk) { s += 20; why.push(t.src === 'prozorro' ? 'Україна — у ваших регіонах пошуку' : `${t.cn || t.cc} — у ваших регіонах пошуку`); }
    else con.push('Країна поза вашими регіонами');
    const e = eurOf(t);
    if (e == null) s += 6;
    else if ((P.min == null || e >= P.min) && (P.max == null || e <= P.max)) { s += 12; if (P.min != null || P.max != null) why.push('Бюджет у вашому діапазоні'); }
    else con.push(P.max != null && e > P.max ? 'Бюджет більший за ваш максимум' : 'Бюджет менший за ваш мінімум');
    const hits = P.kw.filter(w => text.includes(w));
    if (hits.length) { s += Math.min(8, hits.length * 4); why.push(`Ключові слова: ${hits.slice(0, 3).join(', ')}`); }
    const d = daysLeft(t); if (d != null && d <= 3) con.push('До кінця прийому пропозицій менше 3 днів');
    return { s: Math.min(100, s), why, con };
  }
  const scoreColor = s => s >= 70 ? 'var(--good)' : s >= 50 ? 'var(--warn)' : 'var(--text-3)';
  const VERDICT = s => s >= 70 ? ['Добре підходить', 'chip--good'] : s >= 50 ? ['Варто переглянути', 'chip--warn'] : ['Слабкий збіг', ''];
  function photoOf(t) {
    const c = (t.cpv && t.cpv[0]) || '';
    if (/^(09|31|65300|4525|45315)/.test(c)) return PHOTOS.energy;
    if (/^(45221|45222|45233)/.test(c)) return PHOTOS.bridge;
    if (t.cat === 'Роботи' || c.startsWith('45')) return PHOTOS.works;
    if (t.cat === 'Послуги' || /^(7|8|9|5)/.test(c)) return PHOTOS.services;
    return PHOTOS.goods;
  }
  const titleOf = t => t.t || 'Без назви';
  const getT = id => DATA.byId.get(id) || S.snaps[id] || null;
  const snap = t => ({ id: t.id, src: t.src, cc: t.cc, cn: t.cn, t: t.t, b: t.b, bc: t.bc, v: t.v, cur: t.cur, vat: t.vat, g: t.g, end: t.end, enq: t.enq, url: t.url, cpv: t.cpv, cpvN: t.cpvN, cat: t.cat, pt: t.pt, r: t.r, loc: t.loc, lots: t.lots, pub: t.pub, docs: t.docs || [], d: t.d, archived: true });
  function ensureSnap(t) { if (DATA.byId.has(t.id)) S.snaps[t.id] = snap(t); }

  /* ---------- components ---------- */
  function ring(sc, size = 52) {
    if (sc == null) return '';
    const r = size === 52 ? 22 : 52, c = 2 * Math.PI * r, w = size === 52 ? 4 : 7;
    return `<div class="ring${size !== 52 ? ' ring--lg' : ''}" aria-label="Збіг з профілем ${sc} зі 100"><svg viewBox="0 0 ${size} ${size}"><circle class="bg" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${w}"/><circle class="fg" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${w}" stroke="${scoreColor(sc)}" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${c.toFixed(2)}" data-off="${(c * (1 - sc / 100)).toFixed(2)}"/></svg><b class="num">${sc}</b></div>`;
  }
  const animateRings = (root = document) => requestAnimationFrame(() => setTimeout(() => $$('.ring .fg', root).forEach(c => { c.style.strokeDashoffset = c.dataset.off; }), 60));
  function countUp(el, to, fmt = v => nf.format(Math.round(v)), dur = 1300) {
    if (!el) return; if (reduced) { el.textContent = fmt(to); return; }
    const t0 = performance.now(); const step = t => { const k = Math.min(1, (t - t0) / dur); el.textContent = fmt(to * (1 - Math.pow(1 - k, 4))); if (k < 1) requestAnimationFrame(step); }; requestAnimationFrame(step);
  }
  const srcLabel = t => t.src === 'prozorro' ? 'Prozorro' : 'TED';
  const place = t => t.src === 'prozorro' ? ([t.loc, t.r && t.r !== 'Київ' && t.r !== t.loc ? t.r + ' обл.' : ''].filter(Boolean).join(', ') || 'Україна') : ([t.loc, t.cn || t.cc].filter(Boolean).join(', ') || 'ЄС');
  const href = t => '#/tender/' + encodeURIComponent(t.id);
  function trow(t) {
    const d = daysLeft(t), sc = t._s;
    return `<a class="trow" href="${href(t)}">${sc ? ring(sc.s) : '<span></span>'}
      <div><div class="trow__title">${esc(titleOf(t))}</div><div class="trow__meta"><span class="cc">${esc(t.cc)}</span><span>${esc(t.b)}</span><span>${srcLabel(t)}</span></div></div>
      <div class="trow__side"><span class="trow__value num">${money(t.v, t.cur)}</span><span class="dl ${dlCls(d)}">${dlText(d)}</span></div></a>`;
  }
  function tcard(t) {
    const d = daysLeft(t), sc = t._s, v = sc ? VERDICT(sc.s) : null;
    return `<a class="tcard" href="${href(t)}">
      <div class="tcard__media"><div class="lp"><img src="${photoOf(t)}" alt="" loading="lazy"></div><span class="tcard__src">${srcLabel(t)} · ${esc(t.cc)}</span>${sc ? `<span class="tcard__score">${ring(sc.s)}</span>` : ''}</div>
      <div class="tcard__body"><div class="trow__title">${esc(titleOf(t))}</div>
        <div class="trow__meta"><span>${esc(t.b)}</span><span>${esc(place(t))}</span></div>
        <div>${v ? `<span class="chip ${v[1]}">${v[0]}</span>` : ''} ${t.cat ? `<span class="chip">${esc(t.cat)}</span>` : ''}</div>
        <div class="tcard__foot"><span class="trow__value num">${money(t.v, t.cur)}</span><span class="dl ${dlCls(d)}">${dlText(d)}</span></div></div></a>`;
  }
  const lp = src => `<div class="lp"><img src="${src}" alt="" loading="lazy"></div>`;

  /* ---------- router ---------- */
  const routes = { '': overview, tenders, tender, pipeline, bid, library, analytics, settings };
  let cleanup = [];
  const onCleanup = f => cleanup.push(f);
  function render() {
    cleanup.forEach(f => f()); cleanup = [];
    const raw = location.hash.replace(/^#\/?/, ''); const [pathPart, query = ''] = raw.split('?'); const [name = '', ...rest] = pathPart.split('/');
    const arg = rest.length ? decodeURIComponent(rest.join('/')) : undefined; const params = Object.fromEntries(new URLSearchParams(query));
    const view = $('#view'); const fn = routes[name] || overview;
    view.innerHTML = fn(arg, params) || '';
    view.classList.remove('is-entering'); void view.offsetWidth; view.classList.add('is-entering');
    if (fn.mount) fn.mount(view, arg, params);
    animateRings(view);
    $$('.side__nav a').forEach(a => a.classList.toggle('is-active', a.dataset.route === (name || 'overview')));
    $('#side').classList.remove('is-open'); $('#menuBtn').setAttribute('aria-expanded', 'false');
    document.title = (fn.title ? fn.title(arg) + ' — ' : '') + 'Tendera';
    if (!render.first) view.focus({ preventScroll: true }); render.first = false; scrollTo({ top: 0 });
  }
  render.first = true;
  addEventListener('hashchange', render);

  /* ---------- data helpers ---------- */
  const matched = () => DATA.items.filter(t => t._s && t._s.s >= 50 && !S.dismissed[t.id]);
  const inPipe = () => Object.keys(S.pipeline).map(getT).filter(Boolean);
  const dataNote = () => DATA.error ? `<div class="card note note--warn"><b>Дані про тендери ще готуються</b><p>${esc(DATA.error)}</p></div>` : '';
  const profileNote = () => P.empty ? `<div class="card note note--accent"><div><b>Налаштуйте профіль пошуку</b><p>Оберіть напрями діяльності або коди CPV — і ми покажемо, які тендери вам підходять.</p></div><a class="btn btn--primary" href="#/settings?tab=search">Налаштувати</a></div>` : '';

  /* ===================== OVERVIEW ===================== */
  function overview() {
    const fit = matched();
    const pipe = inPipe(); const active = pipe.filter(t => !['result', 'submitted'].includes(S.pipeline[t.id]));
    const won = Object.values(S.outcomes).filter(x => x === 'won').length, decided = Object.values(S.outcomes).length;
    const top = [...fit].sort((a, b) => b._s.s - a._s.s || Date.parse(b.pub || 0) - Date.parse(a.pub || 0)).slice(0, 6);
    const deadlines = active.sort((a, b) => Date.parse(a.end || 0) - Date.parse(b.end || 0)).slice(0, 6);
    const h = new Date().getHours(); const hi = h < 5 ? 'Доброї ночі' : h < 12 ? 'Доброго ранку' : h < 18 ? 'Доброго дня' : 'Доброго вечора';
    const M = DATA.meta || {};
    return `${dataNote()}${profileNote()}
    <section class="hello">${lp(PHOTOS.office)}
      <div class="hello__in"><div><div class="greet">${hi}, ${esc(ACC.firstName)}.</div>
        <p>${DATA.items.length ? `Зараз відкрито ${nf.format(DATA.items.length)} тендерів у Prozorro і TED. ${P.empty ? 'Налаштуйте профіль, щоб побачити свої.' : `Вашому профілю підходять ${nf.format(fit.length)}.`}` : 'Відкриті тендери з’являться після першого оновлення даних.'}</p></div>
        <div class="hello__meta"><div><small>Дані оновлено</small><b>${M.generatedAt ? ago(M.generatedAt) : '—'}</b></div><div><small>Курс НБУ</small><b>${M.rates ? `€1 = ₴${(+M.rates.uahPerEur).toFixed(2)}` : '—'}</b></div></div></div></section>
    <div class="grid g-kpi">
      <div class="card kpi kpi--hero"><small>Сума підходящих тендерів</small><b class="num" id="kSum">€0</b><span>${nf.format(fit.length)} ${plural(fit.length, 'тендер', 'тендери', 'тендерів')} зі збігом від 50</span></div>
      <div class="card kpi"><small>Нові за 24 години</small><b class="num" id="kNew">0</b><span>підходять профілю</span></div>
      <div class="card kpi"><small>Дедлайни за 7 днів</small><b class="num" id="kSoon">0</b><span class="warn">у вашому pipeline</span></div>
      <div class="card kpi"><small>Виграно</small><b class="num">${won} з ${decided}</b><span>${decided ? Math.round(won / decided * 100) + '% успішних' : 'результатів ще немає'}</span></div>
    </div>
    <div class="grid g-main" style="margin-top:16px">
      <section class="card"><div class="card__head"><h2>Найкращі збіги зараз</h2><a href="#/tenders">Усі тендери</a></div>
        <div class="tlist">${top.map(trow).join('') || `<p class="muted">${P.empty ? 'Після налаштування профілю тут з’являться тендери для вас.' : 'Зараз немає відкритих тендерів зі збігом від 50. Спробуйте розширити напрями чи регіони.'}</p>`}</div></section>
      <section class="card mapcard"><div class="card__head"><h2>Де відкриті тендери для вас</h2><a href="#/tenders">Список</a></div>
        <canvas id="miniMap" role="img" aria-label="Карта підходящих тендерів"></canvas>
        <div class="legend"><span><i style="background:var(--brass)"></i>Україна</span><span><i style="background:var(--verd-hi)"></i>ЄС</span></div></section>
    </div>
    <div class="grid g-main" style="margin-top:16px">
      <section class="card"><div class="card__head"><h2>Pipeline за етапами</h2><a href="#/pipeline">Відкрити</a></div>${pipelineChart()}</section>
      <section class="card"><div class="card__head"><h2>Найближчі дедлайни</h2><a href="#/pipeline">Pipeline</a></div>
        <div class="tl">${deadlines.map(t => `<div class="tl__row"><span class="tl__day num">${fmtDate(t.end && new Date(t.end))}</span><span class="tl__dot ${daysLeft(t) <= 3 ? 'urgent' : daysLeft(t) <= 7 ? 'soon' : ''}"></span><div><a href="${href(t)}">${esc(titleOf(t))}</a><small>${STAGES.find(s => s.id === S.pipeline[t.id]).name} · ${money(t.v, t.cur)}</small></div></div>`).join('') || '<p class="muted">Додайте тендери в pipeline кнопкою «Подаюсь» — тут з’являться їхні дедлайни.</p>'}</div></section>
    </div>`;
  }
  overview.title = () => 'Огляд';
  overview.mount = view => {
    const fit = matched();
    countUp($('#kSum', view), fit.reduce((a, t) => a + (eurOf(t) || 0), 0), v => eurShort(v), 1600);
    countUp($('#kNew', view), fit.filter(t => t.pub && Date.now() - Date.parse(t.pub) < 864e5).length);
    countUp($('#kSoon', view), inPipe().filter(t => !['result', 'submitted'].includes(S.pipeline[t.id]) && daysLeft(t) != null && daysLeft(t) >= 0 && daysLeft(t) <= 7).length);
    miniMap($('#miniMap', view), [...fit].sort((a, b) => b._s.s - a._s.s).slice(0, 400));
  };
  function pipelineChart() {
    const data = STAGES.map(s => { const items = inPipe().filter(t => S.pipeline[t.id] === s.id); return { s, n: items.length, v: items.reduce((a, t) => a + (eurOf(t) || 0), 0) }; });
    if (!data.some(d => d.n)) return '<p class="muted">Pipeline порожній. Відкрийте тендер і натисніть «Подаюсь».</p>';
    const max = Math.max(1, ...data.map(d => d.n)); const W = 560, rowH = 40;
    return `<svg class="chart" viewBox="0 0 ${W} ${data.length * rowH + 4}" role="img" aria-label="Кількість тендерів на кожному етапі">${data.map((d, i) => { const w = Math.max(4, (W - 250) * d.n / max);
      return `<g transform="translate(0 ${i * rowH})"><text x="0" y="24">${d.s.name}</text><rect x="110" y="10" width="${w}" height="20" rx="5" fill="var(--verd)" fill-opacity="${.45 + .55 * d.n / max}"/><text x="${118 + w}" y="24" style="fill:var(--text)">${d.n}${d.v ? ' · ' + eurShort(d.v) : ''}</text></g>`; }).join('')}</svg>`;
  }
  const UA_REG = { 'Вінницька': [28.47, 49.23], 'Волинська': [25.33, 50.75], 'Дніпропетровська': [35.04, 48.46], 'Донецька': [37.8, 48.0], 'Житомирська': [28.66, 50.25], 'Закарпатська': [22.29, 48.62], 'Запорізька': [35.14, 47.84], 'Івано-Франківська': [24.71, 48.92], 'Київська': [30.3, 50.3], 'Кіровоградська': [32.26, 48.51], 'Луганська': [39.3, 48.57], 'Львівська': [24.03, 49.84], 'Миколаївська': [31.99, 46.97], 'Одеська': [30.73, 46.48], 'Полтавська': [34.55, 49.59], 'Рівненська': [26.25, 50.62], 'Сумська': [34.8, 50.91], 'Тернопільська': [25.59, 49.55], 'Харківська': [36.23, 49.99], 'Херсонська': [32.62, 46.64], 'Хмельницька': [26.98, 49.42], 'Черкаська': [32.06, 49.44], 'Чернівецька': [25.94, 48.29], 'Чернігівська': [31.29, 51.49], 'Київ': [30.52, 50.45] };
  const EU_CAP = { PL: [21.01, 52.23], DE: [13.4, 52.52], LT: [25.28, 54.69], LV: [24.1, 56.95], EE: [24.75, 59.44], CZ: [14.42, 50.08], SK: [17.11, 48.15], RO: [26.1, 44.43], AT: [16.37, 48.21], NL: [4.9, 52.37], HU: [19.04, 47.5], BG: [23.32, 42.7], SI: [14.51, 46.06], HR: [15.98, 45.81], FR: [2.35, 48.86], IT: [12.5, 41.9], ES: [-3.7, 40.42], BE: [4.35, 50.85], SE: [18.07, 59.33], FI: [24.94, 60.17], DK: [12.57, 55.68], IE: [-6.26, 53.35], PT: [-9.14, 38.72], GR: [23.73, 37.98], LU: [6.13, 49.61] };
  // та сама проєкція, що й у europe.js (azimuthal equal-area, rotate [-16,-53], scale 1250, translate [520,420])
  function project(lon, lat) {
    const r = Math.PI / 180, l0 = 16 * r, p0 = 53 * r, l = lon * r, p = lat * r;
    const k = Math.sqrt(2 / (1 + Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(l - l0)));
    return [520 + 1250 * k * Math.cos(p) * Math.sin(l - l0), 420 - 1250 * k * (Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(l - l0))];
  }
  function miniMap(canvas, list) {
    if (!canvas || !window.EUROPE) return;
    const E = window.EUROPE, ctx = canvas.getContext('2d');
    const pins = list.map((t, i) => { const ll = t.src === 'prozorro' ? UA_REG[t.r] : EU_CAP[t.cc]; if (!ll) return null; const [x, y] = project(ll[0], ll[1]); return { t, x: x + ((i * 37) % 19 - 9), y: y + ((i * 53) % 17 - 8) }; }).filter(Boolean);
    let W, H, k, dpr, raf = 0, hover = null, base = null;
    const dotCol = getComputedStyle(document.documentElement).getPropertyValue('--text-3').trim();
    function size() {
      const r = canvas.getBoundingClientRect(); dpr = Math.min(2, devicePixelRatio || 1); W = r.width; H = r.height; canvas.width = W * dpr; canvas.height = H * dpr; k = W / E.w;
      base = document.createElement('canvas'); base.width = Math.max(1, W * dpr); base.height = Math.max(1, H * dpr);
      const b = base.getContext('2d'); b.scale(dpr, dpr); b.globalAlpha = .38; b.fillStyle = dotCol; b.beginPath(); const rr = Math.max(.8, 1.9 * k);
      for (let i = 0; i < E.dots.length; i += 2) { const x = E.dots[i] * k, y = E.dots[i + 1] * k; b.moveTo(x + rr, y); b.arc(x, y, rr, 0, 6.283); } b.fill();
    }
    function draw(tm) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H); if (base) ctx.drawImage(base, 0, 0, W, H);
      pins.forEach((p, i) => { const x = p.x * k, y = p.y * k, col = p.t.src === 'prozorro' ? '200,164,106' : '111,209,191';
        if (!reduced && i < 40) { const ph = ((tm / 1000 + i * .37) % 2.6) / 2.6; ctx.strokeStyle = `rgba(${col},${.6 * (1 - ph)})`; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.arc(x, y, 3 + ph * 20, 0, 6.283); ctx.stroke(); }
        ctx.fillStyle = `rgba(${col},.9)`; ctx.beginPath(); ctx.arc(x, y, hover === p ? 6 : 3, 0, 6.283); ctx.fill(); });
      if (hover) { const x = hover.x * k, y = hover.y * k, s = titleOf(hover.t), label = s.length > 40 ? s.slice(0, 39) + '…' : s; ctx.font = '500 12px Geist, sans-serif'; const tw = ctx.measureText(label).width + 20; const bx = Math.min(Math.max(8, x - tw / 2), W - tw - 8), by = Math.max(4, y - 40);
        ctx.fillStyle = 'rgba(10,24,35,.94)'; ctx.beginPath(); ctx.roundRect(bx, by, tw, 26, 8); ctx.fill(); ctx.fillStyle = '#EDF0EA'; ctx.fillText(label, bx + 10, by + 17); }
    }
    const loop = tm => { draw(tm); raf = requestAnimationFrame(loop); };
    size(); reduced ? draw(0) : (raf = requestAnimationFrame(loop));
    const pick = e => { const r = canvas.getBoundingClientRect(); const mx = e.clientX - r.left, my = e.clientY - r.top; let best = null, bd = 14; pins.forEach(p => { const d = Math.hypot(p.x * k - mx, p.y * k - my); if (d < bd) { bd = d; best = p; } }); return best; };
    canvas.addEventListener('pointermove', e => { hover = pick(e); canvas.style.cursor = hover ? 'pointer' : 'default'; if (reduced) draw(0); });
    canvas.addEventListener('pointerleave', () => { hover = null; if (reduced) draw(0); });
    canvas.addEventListener('click', e => { const p = pick(e); if (p) location.hash = href(p.t); });
    let lastW = 0; const ro = new ResizeObserver(() => { const w = Math.round(canvas.getBoundingClientRect().width); if (Math.abs(w - lastW) < 2) return; lastW = w; size(); if (reduced) draw(0); }); ro.observe(canvas);
    onCleanup(() => { cancelAnimationFrame(raf); ro.disconnect(); });
  }

  /* ===================== TENDERS ===================== */
  const F = { q: '', src: 'all', min: 50, cat: '', sort: 'score', maxEur: 0, shown: 60, saved: false };
  function tenders(_, params) {
    if (params.sort) F.sort = params.sort; if (params.saved) F.saved = true; if (P.empty) F.min = 0;
    return `${dataNote()}${profileNote()}<div class="ph"><div><h1>Тендери</h1><p>${nf.format(DATA.items.length)} відкритих закупівель з Prozorro і TED${DATA.meta && DATA.meta.generatedAt ? ', оновлено ' + ago(DATA.meta.generatedAt) : ''}.</p></div>
      <div class="ph__actions"><div class="seg" role="group" aria-label="Вигляд"><button type="button" data-view="cards" aria-pressed="${S.view === 'cards'}">Картки</button><button type="button" data-view="table" aria-pressed="${S.view === 'table'}">Таблиця</button></div></div></div>
    <div class="filters">
      <input class="select" style="min-width:240px" type="search" id="fq" placeholder="Пошук: назва, замовник, CPV, ID" value="${esc(F.q)}" aria-label="Пошук">
      <div class="seg" role="group" aria-label="Джерело">${[['all', 'Усі'], ['prozorro', 'Україна'], ['ted', 'ЄС']].map(([k, n]) => `<button type="button" data-src="${k}" aria-pressed="${F.src === k}">${n}</button>`).join('')}</div>
      <div class="seg" role="group" aria-label="Збіг">${[[50, 'Підходящі'], [0, 'Усі']].map(([k, n]) => `<button type="button" data-min="${k}" aria-pressed="${F.min === k}"${P.empty && k ? ' disabled' : ''}>${n}</button>`).join('')}</div>
      <select class="select" id="fcat" aria-label="Предмет закупівлі"><option value="">Роботи, товари, послуги</option>${['Роботи', 'Товари', 'Послуги'].map(c => `<option${F.cat === c ? ' selected' : ''}>${c}</option>`).join('')}</select>
      <select class="select" id="fmax" aria-label="Максимальний бюджет"><option value="0">Будь-який бюджет</option>${[50e3, 200e3, 1e6, 5e6].map(v => `<option value="${v}"${F.maxEur === v ? ' selected' : ''}>до ${eurShort(v)}</option>`).join('')}</select>
      <select class="select" id="fsort" aria-label="Сортування">${[['score', 'За збігом'], ['deadline', 'За дедлайном'], ['value', 'За бюджетом'], ['fresh', 'Найновіші']].map(([k, n]) => `<option value="${k}"${F.sort === k ? ' selected' : ''}>${n}</option>`).join('')}</select>
      <button type="button" class="fchip" id="fsaved" aria-pressed="${F.saved}">Збережені</button>
    </div><div id="results"></div>`;
  }
  tenders.title = () => 'Тендери';
  tenders.mount = view => {
    const out = $('#results', view);
    function list() {
      const q = F.q.trim().toLowerCase();
      const l = DATA.items.filter(t => !S.dismissed[t.id] && (F.src === 'all' || t.src === F.src) && (!F.cat || t.cat === F.cat) && (!F.saved || S.saved[t.id])
        && (!F.min || (t._s && t._s.s >= F.min)) && (!F.maxEur || (eurOf(t) != null && eurOf(t) <= F.maxEur))
        && (!q || (t.t + ' ' + t.b + ' ' + t.cpv.join(' ') + ' ' + (t.cpvN || '') + ' ' + t.id).toLowerCase().includes(q)));
      const so = { score: (a, b) => (b._s ? b._s.s : 0) - (a._s ? a._s.s : 0) || Date.parse(a.end) - Date.parse(b.end), deadline: (a, b) => Date.parse(a.end) - Date.parse(b.end), value: (a, b) => (eurOf(b) || 0) - (eurOf(a) || 0), fresh: (a, b) => Date.parse(b.pub || 0) - Date.parse(a.pub || 0) };
      return l.sort(so[F.sort] || so.score);
    }
    function apply() {
      const l = list();
      if (!l.length) { out.innerHTML = `<div class="empty"><b>${DATA.items.length ? 'Нічого не знайдено' : 'Тендери ще завантажуються'}</b>${DATA.items.length ? 'Змініть фільтри або розширте профіль пошуку.' : 'Перше оновлення даних займає кілька хвилин після публікації сайту.'}</div>`; return; }
      const part = l.slice(0, F.shown);
      out.innerHTML = (S.view === 'table'
        ? `<div class="tscroll"><table class="table"><thead><tr><th>Збіг</th><th>Тендер</th><th>Країна</th><th>Бюджет</th><th>Дедлайн</th></tr></thead><tbody>${part.map(t => `<tr><td><b class="num" style="color:${t._s ? scoreColor(t._s.s) : 'inherit'}">${t._s ? t._s.s : '—'}</b></td><td><a href="${href(t)}">${esc(titleOf(t))}</a><br><small style="color:var(--text-3)">${esc(t.b)}</small></td><td>${esc(t.cc)}</td><td class="num">${money(t.v, t.cur)}</td><td><span class="dl ${dlCls(daysLeft(t))}">${fmtDate(t.end && new Date(t.end))}</span></td></tr>`).join('')}</tbody></table></div>`
        : `<div class="tgrid">${part.map(tcard).join('')}</div>`)
        + `<p class="muted" style="text-align:center;margin:20px 0 0">Показано ${nf.format(part.length)} з ${nf.format(l.length)}${l.length > part.length ? ' <button class="btn btn--ghost btn--sm" type="button" id="more" style="margin-left:8px">Показати ще</button>' : ''}</p>`;
      $('#more', out)?.addEventListener('click', () => { F.shown += 60; apply(); });
      animateRings(out);
    }
    let qt = 0;
    $('#fq', view).addEventListener('input', e => { clearTimeout(qt); qt = setTimeout(() => { F.q = e.target.value; F.shown = 60; apply(); }, 180); });
    $$('[data-src]', view).forEach(b => b.onclick = () => { F.src = b.dataset.src; F.shown = 60; $$('[data-src]', view).forEach(x => x.setAttribute('aria-pressed', String(x === b))); apply(); });
    $$('[data-min]', view).forEach(b => b.onclick = () => { F.min = +b.dataset.min; F.shown = 60; $$('[data-min]', view).forEach(x => x.setAttribute('aria-pressed', String(x === b))); apply(); });
    $('#fcat', view).onchange = e => { F.cat = e.target.value; F.shown = 60; apply(); };
    $('#fmax', view).onchange = e => { F.maxEur = +e.target.value; F.shown = 60; apply(); };
    $('#fsort', view).onchange = e => { F.sort = e.target.value; apply(); };
    $('#fsaved', view).onclick = e => { F.saved = !F.saved; e.currentTarget.setAttribute('aria-pressed', String(F.saved)); apply(); };
    $$('[data-view]', view).forEach(b => b.onclick = () => { S.view = b.dataset.view; local.set('view', S.view); $$('[data-view]', view).forEach(x => x.setAttribute('aria-pressed', String(x === b))); apply(); });
    apply();
  };

  /* ===================== TENDER DETAIL ===================== */
  function tender(id, params) {
    const t = getT(id);
    if (!t) return `<div class="empty"><b>Тендер не знайдено</b>Можливо, прийом пропозицій уже завершено. <a href="#/tenders">До стрічки</a></div>`;
    const sc = DATA.byId.has(t.id) ? t._s : null; const d = daysLeft(t); const stage = S.pipeline[t.id]; const v = sc ? VERDICT(sc.s) : null; const eur = eurOf(t);
    return `<section class="thero">${lp(photoOf(t))}<div class="thero__in">
        <div class="crumbs"><a href="#/tenders">Тендери</a> / ${esc(t.id)}${!DATA.byId.has(t.id) ? ' · прийом пропозицій завершено' : ''}</div>
        <h1>${esc(titleOf(t))}</h1>
        <div class="thero__facts">
          <div><small>Очікувана вартість${t.vat ? ' з ПДВ' : ''}</small><b class="num">${money(t.v, t.cur)}</b>${eur && t.cur !== 'EUR' ? `<small>≈ ${eurShort(eur)} за курсом НБУ</small>` : ''}</div>
          <div><small>Кінцевий строк пропозицій</small><b>${fmtDateTime(t.end && new Date(t.end))}</b></div>
          ${t.g ? `<div><small>Тендерне забезпечення</small><b class="num">${money(t.g, t.cur)}</b></div>` : ''}
          <div><small>Замовник</small><b>${esc(t.b)}</b>${t.bc ? `<small>ЄДРПОУ ${esc(t.bc)}</small>` : ''}</div>
          <div><small>Місце</small><b>${esc(place(t))}</b></div>
        </div></div></section>
    <div class="dgrid">
      <section class="card">
        <div class="tabs" role="tablist">${[['info', 'Огляд'], ['docs', `Документи${t.docs && t.docs.length ? ` <span class="chip" style="margin-left:4px">${t.docs.length}</span>` : ''}`], ['check', 'Чекліст'], ['notes', 'Нотатки команди']].map(([k, n]) => `<button type="button" role="tab" data-tab="${k}" aria-selected="${(params.tab || 'info') === k}">${n}</button>`).join('')}</div>
        <div id="tabBody"></div>
      </section>
      <aside class="verdict">
        <section class="card">
          ${sc ? `<div class="verdict__score">${ring(sc.s, 120)}<div><div class="verdict__label">Збіг з профілем</div><p class="verdict__title ${sc.s >= 70 ? 'bid' : sc.s >= 50 ? 'consider' : 'skip'}">${v[0]}</p><small style="color:var(--text-3)">за напрямами, регіоном і бюджетом</small></div></div>` : '<p class="verdict__label" style="margin:0">Тендер з вашого pipeline</p>'}
          <div class="verdict__btns" style="margin-top:16px">${stage ? `<a class="btn btn--primary" href="#/bid/${encodeURIComponent(t.id)}">Готувати заявку</a><a class="btn btn--ghost" href="#/pipeline">У pipeline</a>`
            : `<button class="btn btn--primary" type="button" id="goBid">Подаюсь</button><button class="btn btn--ghost" type="button" id="noBid">Не цікаво</button>`}</div>
          <div id="noWhy" hidden style="margin-top:10px"><p style="margin:0 0 8px;font-size:13px;color:var(--text-3)">Чому? Це допоможе налаштувати профіль.</p><div class="tags">${['Не наш профіль', 'Не той бюджет', 'Не встигаємо', 'Не та країна', 'Інше'].map(r => `<button type="button" class="fchip" data-why="${r}">${r}</button>`).join('')}</div></div>
          <a class="btn btn--ghost btn--sm" href="${esc(t.url)}" target="_blank" rel="noopener" style="margin-top:10px;width:100%">${ICON.ext}Відкрити на ${srcLabel(t)}</a>
        </section>
        ${d != null && d >= 0 ? `<section class="card"><h2 style="margin-bottom:12px">До кінця прийому пропозицій</h2><div class="countdown" id="cd" data-due="${esc(t.end)}"></div>${t.enq ? `<p class="muted" style="margin:12px 0 0">Питання замовнику — до ${fmtDateTime(new Date(t.enq))}</p>` : ''}</section>` : ''}
        <section class="card"><dl class="facts">
          <div><dt>Джерело</dt><dd>${srcLabel(t)}</dd></div>
          ${t.pt ? `<div><dt>Процедура</dt><dd>${esc(t.pt)}</dd></div>` : ''}
          ${t.cat ? `<div><dt>Предмет</dt><dd>${esc(t.cat)}</dd></div>` : ''}
          ${t.lots > 1 ? `<div><dt>Лотів</dt><dd class="num">${t.lots}</dd></div>` : ''}
          <div><dt>CPV</dt><dd class="num">${(t.cpv || []).slice(0, 3).join(', ') || '—'}</dd></div>
          ${t.pub ? `<div><dt>Опубліковано</dt><dd>${fmtDate(new Date(t.pub))}</dd></div>` : ''}
        </dl><button class="btn btn--ghost btn--sm" type="button" id="saveT" style="margin-top:14px;width:100%">${S.saved[t.id] ? 'Збережено' : 'Зберегти'}</button></section>
      </aside>
    </div>`;
  }
  tender.title = id => { const t = getT(id); return t ? titleOf(t).slice(0, 60) : 'Тендер'; };
  tender.mount = (view, id, params) => {
    const t = getT(id); if (!t) return; const body = $('#tabBody', view);
    const similar = () => { const div = ((t.cpv && t.cpv[0]) || '').slice(0, 3); if (div.length < 3) return []; return DATA.items.filter(x => x.id !== t.id && x.cpv.some(c => c.startsWith(div)) && !S.dismissed[x.id]).sort((a, b) => (b._s ? b._s.s : 0) - (a._s ? a._s.s : 0)).slice(0, 4); };
    const tabs = {
      info: () => { const sc = DATA.byId.has(t.id) ? t._s : null; const sim = similar();
        return `${t.d ? `<p class="brief">${esc(t.d)}</p>` : '<p class="muted">Опис у повідомленні не надано — дивіться документацію.</p>'}
        ${t.cpvN ? `<p class="muted" style="margin:0 0 16px">Предмет за CPV: <b style="color:var(--text);font-weight:500">${esc(t.cpv[0] || '')}</b> — ${esc(t.cpvN)}</p>` : ''}
        ${sc ? `<div class="reasons"><div><h3>Чому показуємо</h3><ul>${(sc.why.length ? sc.why : ['Збігів з профілем мало']).map(r => `<li>${esc(r)}</li>`).join('')}</ul></div><div class="con"><h3>На що зважити</h3><ul>${(sc.con.length ? sc.con : ['Суттєвих розбіжностей з профілем немає']).map(r => `<li>${esc(r)}</li>`).join('')}</ul></div></div>` : ''}
        ${sim.length ? `<h3 class="h3">Схожі відкриті тендери</h3><div class="tlist">${sim.map(trow).join('')}</div>` : ''}`; },
      docs: () => t.docs && t.docs.length ? `<ul class="req">${t.docs.map(x => `<li><span class="st st--ok">${ICON.doc}</span><div><a href="${esc(x.u)}" target="_blank" rel="noopener" style="text-decoration:none">${esc(x.t)}</a><small>${esc((x.f || 'файл').toUpperCase())} · з ${srcLabel(t)}</small></div><a class="cite" href="${esc(x.u)}" target="_blank" rel="noopener">Відкрити</a></li>`).join('')}</ul>`
        : `<p class="muted">${t.src === 'ted' ? 'Документація TED доступна за посиланням у повідомленні.' : 'До оголошення не прикріплено документів.'}</p><a class="btn btn--ghost" href="${esc(t.url)}" target="_blank" rel="noopener">${ICON.ext}Відкрити оголошення</a>`,
      check: () => checklistHtml(t),
      notes: () => `<label class="sr-only" for="note">Нотатки</label><textarea id="note" class="editor editor--sans" placeholder="Нотатки для команди: питання до замовника, ціни постачальників, хто що робить…">${esc(S.notes[t.id] || '')}</textarea><p class="muted" style="margin:8px 0 0" id="noteSt">Нотатки бачать усі учасники вашої компанії.</p>`
    };
    function show(k) { $$('[data-tab]', view).forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === k))); body.innerHTML = tabs[k](); bindTab(k); animateRings(body); }
    function bindTab(k) {
      if (k === 'check') bindChecklist(body, t, () => show('check'));
      if (k === 'notes') { let nt = 0; $('#note', body).addEventListener('input', e => { clearTimeout(nt); $('#noteSt', body).textContent = 'Зберігаємо…'; nt = setTimeout(() => { S.notes[t.id] = e.target.value.slice(0, 20000); ensureSnap(t); save(); $('#noteSt', body).textContent = 'Збережено'; }, 700); }); }
    }
    $$('[data-tab]', view).forEach(b => b.onclick = () => show(b.dataset.tab));
    show(params.tab && tabs[params.tab] ? params.tab : 'info');
    $('#goBid', view)?.addEventListener('click', () => { S.pipeline[t.id] = 'new'; ensureSnap(t); save(); toast(`Додано в pipeline. <a href="#/bid/${encodeURIComponent(t.id)}">Готувати заявку</a>`); render(); });
    $('#noBid', view)?.addEventListener('click', () => { $('#noWhy', view).hidden = false; });
    $$('[data-why]', view).forEach(b => b.onclick = () => { S.dismissed[t.id] = { r: b.dataset.why, at: new Date().toISOString() }; save(); toast('Приховано. Причину враховано в аналітиці.'); location.hash = '#/tenders'; });
    $('#saveT', view).onclick = e => { if (S.saved[t.id]) delete S.saved[t.id]; else { S.saved[t.id] = true; ensureSnap(t); } save(); e.target.textContent = S.saved[t.id] ? 'Збережено' : 'Зберегти'; };
    const cd = $('#cd', view);
    if (cd) { const due = new Date(cd.dataset.due); const tick = () => { const ms = Math.max(0, due - new Date()); const dd = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60, s = Math.floor(ms / 1e3) % 60; cd.innerHTML = [[dd, 'днів'], [h, 'год'], [m, 'хв'], [s, 'сек']].map(([v, l]) => `<div><b class="num">${String(v).padStart(2, '0')}</b><small>${l}</small></div>`).join(''); }; tick(); const iv = setInterval(tick, 1000); onCleanup(() => clearInterval(iv)); }
  };

  /* ---------- checklist: реальні кроки подачі + власні пункти ---------- */
  function defaultChecks(t) {
    const out = [t.src === 'prozorro' ? 'Акаунт на авторизованому електронному майданчику Prozorro' : 'Реєстрація на платформі подачі, вказаній у повідомленні TED', 'Прочитати тендерну документацію і проєкт договору'];
    if (t.enq) out.push(`Поставити питання замовнику до ${fmtDate(new Date(t.enq))}`);
    if (t.g) out.push(`Оформити тендерне забезпечення: ${money(t.g, t.cur)}`);
    out.push('Документи, що підтверджують кваліфікацію', 'Цінова пропозиція');
    if (t.src === 'prozorro') out.push('Перевірити кваліфікований електронний підпис (КЕП)');
    out.push(`Подати пропозицію до ${fmtDateTime(t.end && new Date(t.end))}`);
    return out.map(x => ({ t: x, done: false }));
  }
  function checklistHtml(t) {
    const list = S.checks[t.id] || defaultChecks(t); const done = list.filter(x => x.done).length;
    return `<p class="muted" style="margin:0 0 10px">${done} з ${list.length} виконано</p>
      <div class="progress" style="margin-bottom:14px"><span style="width:${list.length ? Math.round(done / list.length * 100) : 0}%"></span></div>
      <ul class="check">${list.map((x, i) => `<li class="${x.done ? 'is-done' : ''}"><input type="checkbox" id="ck-${i}" data-i="${i}" ${x.done ? 'checked' : ''}><label for="ck-${i}">${esc(x.t)}</label><button class="icon-btn icon-btn--sm" type="button" data-del="${i}" aria-label="Видалити пункт">${ICON.trash}</button></li>`).join('')}</ul>
      <form id="ckAdd" class="inline-form"><label class="sr-only" for="ckNew">Новий пункт</label><input id="ckNew" class="select" maxlength="200" placeholder="Додати свій пункт"><button class="btn btn--ghost" type="submit">Додати</button></form>`;
  }
  function bindChecklist(root, t, rerender) {
    const get = () => (S.checks[t.id] = S.checks[t.id] || defaultChecks(t));
    $$('input[data-i]', root).forEach(cb => cb.onchange = () => { get()[cb.dataset.i].done = cb.checked; ensureSnap(t); save(); rerender(); });
    $$('[data-del]', root).forEach(b => b.onclick = () => { get().splice(+b.dataset.del, 1); save(); rerender(); });
    $('#ckAdd', root).onsubmit = e => { e.preventDefault(); const v = $('#ckNew', root).value.trim(); if (!v) return; get().push({ t: v, done: false }); ensureSnap(t); save(); rerender(); };
  }

  /* ===================== PIPELINE ===================== */
  function pipeline() {
    return `<div class="ph"><div><h1>Pipeline</h1><p>Перетягуйте картки між етапами або використовуйте стрілки. Бачить уся команда.</p></div><div class="ph__actions"><a class="btn btn--primary" href="#/tenders">Знайти тендер</a></div></div>
    <div class="board" id="board">${STAGES.map((s, si) => { const items = inPipe().filter(t => S.pipeline[t.id] === s.id);
      return `<section class="col" data-stage="${s.id}" aria-label="${s.name}"><div class="col__head"><b>${s.name}</b><span>${items.length}</span></div><div class="col__sum num">${items.length ? eurShort(items.reduce((a, t) => a + (eurOf(t) || 0), 0)) : '—'}</div>
        ${items.map(t => `<article class="kcard" draggable="true" data-id="${esc(t.id)}"><a href="${href(t)}">${esc(titleOf(t))}</a>
          <div class="kcard__row"><span class="num">${money(t.v, t.cur)}</span><span class="dl ${dlCls(daysLeft(t))}">${fmtDate(t.end && new Date(t.end))}</span></div>
          ${s.id === 'result' ? `<div class="kcard__row"><span>${S.outcomes[t.id] === 'won' ? '<span class="chip chip--good">Виграли</span>' : S.outcomes[t.id] === 'lost' ? '<span class="chip chip--bad">Не виграли</span>' : '<span class="chip">Який результат?</span>'}</span><span class="kcard__move"><button type="button" data-out="won" aria-label="Виграли">✓</button><button type="button" data-out="lost" aria-label="Не виграли">✕</button></span></div>` : ''}
          <div class="kcard__row"><a href="#/bid/${encodeURIComponent(t.id)}" class="kcard__link">Заявка</a><span class="kcard__move"><button type="button" data-move="-1" aria-label="На етап назад" ${si === 0 ? 'disabled' : ''}>‹</button><button type="button" data-move="1" aria-label="На наступний етап" ${si === STAGES.length - 1 ? 'disabled' : ''}>›</button><button type="button" data-rm aria-label="Прибрати з pipeline">×</button></span></div></article>`).join('') || '<p class="muted" style="padding:4px">Перетягніть сюди</p>'}</section>`; }).join('')}</div>`;
  }
  pipeline.title = () => 'Pipeline';
  pipeline.mount = view => {
    const move = (id, stage) => { S.pipeline[id] = stage; save(); render(); toast(`Перенесено в «${STAGES.find(s => s.id === stage).name}»`); };
    $$('.kcard', view).forEach(c => {
      const id = c.dataset.id;
      c.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', id); c.classList.add('is-dragging'); });
      c.addEventListener('dragend', () => c.classList.remove('is-dragging'));
      $$('[data-move]', c).forEach(b => b.onclick = () => { const i = STAGES.findIndex(s => s.id === S.pipeline[id]) + +b.dataset.move; if (STAGES[i]) move(id, STAGES[i].id); });
      $$('[data-out]', c).forEach(b => b.onclick = () => { S.outcomes[id] = b.dataset.out; save(); render(); });
      $('[data-rm]', c).onclick = () => { if (!confirm('Прибрати тендер з pipeline? Чекліст і нотатки збережуться.')) return; delete S.pipeline[id]; delete S.outcomes[id]; save(); render(); };
    });
    $$('.col', view).forEach(col => {
      col.addEventListener('dragover', e => { e.preventDefault(); col.classList.add('is-over'); });
      col.addEventListener('dragleave', () => col.classList.remove('is-over'));
      col.addEventListener('drop', e => { e.preventDefault(); col.classList.remove('is-over'); const id = e.dataTransfer.getData('text/plain'); if (id && S.pipeline[id] && S.pipeline[id] !== col.dataset.stage) move(id, col.dataset.stage); });
    });
  };

  /* ===================== BID WORKSPACE ===================== */
  const extOf = n => ((n || '').split('.').pop() || 'FILE').slice(0, 4).toUpperCase();
  const sizeOf = b => b == null ? '' : b > 1e6 ? (b / 1e6).toFixed(1).replace('.', ',') + ' МБ' : Math.max(1, Math.round(b / 1e3)) + ' КБ';
  const docDays = l => l.valid_until ? Math.ceil((Date.parse(l.valid_until) - Date.now()) / 864e5) : null;
  function bid(id) {
    const opts = inPipe(); const t = (id && getT(id)) || opts[0];
    if (!t) return `<div class="empty"><b>Ще немає заявок у роботі</b>Відкрийте тендер і натисніть «Подаюсь» — тут з’явиться робоче місце заявки.<br><br><a class="btn btn--primary" href="#/tenders">Обрати тендер</a></div>`;
    return `<div class="ph"><div><h1>Заявка</h1><p>${esc(titleOf(t))}</p></div>
      <div class="ph__actions"><label class="sr-only" for="bidSel">Тендер</label><select class="select" id="bidSel">${opts.map(o => `<option value="${esc(o.id)}"${o.id === t.id ? ' selected' : ''}>${esc(titleOf(o).slice(0, 70))}</option>`).join('')}${opts.some(o => o.id === t.id) ? '' : `<option selected value="${esc(t.id)}">${esc(titleOf(t).slice(0, 70))}</option>`}</select><a class="btn btn--ghost" href="${href(t)}">До тендера</a></div></div>
    <div class="bgrid">
      <div class="grid">
        <section class="card"><div class="card__head"><h2>Чекліст подачі</h2></div><div id="ck">${checklistHtml(t)}</div></section>
        <section class="card"><div class="card__head"><h2>Текст пропозиції</h2><span class="muted" id="saved">Зберігається автоматично</span></div>
          <div class="toolbar"><button class="btn btn--ghost btn--sm" type="button" id="tplLetter">Шаблон супровідного листа</button><button class="btn btn--ghost btn--sm" type="button" id="copy">${ICON.copy}Копіювати</button><button class="btn btn--ghost btn--sm" type="button" id="dl">${ICON.down}Завантажити .txt</button></div>
          <div class="editor" id="ed" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Текст пропозиції" data-placeholder="Напишіть текст пропозиції або вставте шаблон супровідного листа з даними тендера і вашої компанії.">${esc(S.drafts[t.id] || '')}</div></section>
      </div>
      <aside class="grid">
        <section class="card"><dl class="facts">
          <div><dt>Подати до</dt><dd>${fmtDateTime(t.end && new Date(t.end))}</dd></div>
          <div><dt>Вартість</dt><dd class="num">${money(t.v, t.cur)}</dd></div>
          ${t.g ? `<div><dt>Забезпечення</dt><dd class="num">${money(t.g, t.cur)}</dd></div>` : ''}
          <div><dt>Етап</dt><dd>${S.pipeline[t.id] ? STAGES.find(s => s.id === S.pipeline[t.id]).name : 'не в pipeline'}</dd></div>
        </dl><a class="btn btn--ghost btn--sm" href="${esc(t.url)}" target="_blank" rel="noopener" style="margin-top:14px;width:100%">${ICON.ext}Оголошення на ${srcLabel(t)}</a></section>
        <section class="card"><div class="card__head"><h2>Документи компанії</h2><a href="#/library">Бібліотека</a></div>
          ${ACC.docs.length ? ACC.docs.slice(0, 8).map(l => { const d = docDays(l); return `<div class="docline"><span class="libc__ic libc__ic--sm">${esc(extOf(l.name))}</span><div><div class="docline__name">${esc(l.name)}</div><small style="color:${d != null && d < 15 ? 'var(--bad)' : 'var(--text-3)'}">${d == null ? esc(l.doc_type) : d < 0 ? 'Строк дії минув' : `Дійсний ще ${d} дн.`}</small></div></div>`; }).join('') : '<p class="muted" style="margin:0">Завантажте статутні документи, довідки й сертифікати — вони знадобляться для кожної заявки.</p>'}</section>
        <section class="card"><h2 style="margin-bottom:12px">Команда</h2>${ACC.team.map(m => `<div class="docline"><span class="avatar avatar--sm">${esc(initials(m.name))}</span><div>${esc(m.name)}<small style="display:block;color:var(--text-3)">${esc(m.role)}</small></div></div>`).join('')}</section>
      </aside></div>`;
  }
  bid.title = () => 'Заявка';
  bid.mount = (view, id) => {
    const t = (id && getT(id)) || inPipe()[0]; if (!t) return;
    $('#bidSel', view).onchange = e => { location.hash = '#/bid/' + encodeURIComponent(e.target.value); };
    const ck = $('#ck', view); const re = () => { ck.innerHTML = checklistHtml(t); bindChecklist(ck, t, re); }; bindChecklist(ck, t, re);
    const ed = $('#ed', view); let tm = 0;
    const persist = () => { S.drafts[t.id] = ed.innerText.slice(0, 50000); ensureSnap(t); save(); $('#saved', view).textContent = 'Збережено'; };
    ed.addEventListener('input', () => { clearTimeout(tm); $('#saved', view).textContent = 'Зберігаємо…'; tm = setTimeout(persist, 700); });
    $('#tplLetter', view).onclick = () => {
      if (ed.innerText.trim() && !confirm('Замінити поточний текст шаблоном?')) return;
      const o = ACC.org, now = new Date();
      ed.innerText = `${o.name}${o.reg_code ? `, код ${o.reg_code}` : ''}\n${fmtDate(now)} ${now.getFullYear()} р.\n\nДо: ${t.b}\n\nСупровідний лист до тендерної пропозиції\n\nЗакупівля: ${titleOf(t)}\nІдентифікатор: ${t.id}\n\n${o.name} подає тендерну пропозицію на участь у зазначеній закупівлі. Підтверджуємо, що ознайомилися з тендерною документацією та проєктом договору, погоджуємося з їхніми умовами та готові виконати договір у визначені строки.\n\nДо пропозиції додаються документи відповідно до вимог тендерної документації.\n\nКонтактна особа: ${ACC.name}${ACC.profile.job_title ? `, ${ACC.profile.job_title.toLowerCase()}` : ''}, ${ACC.email}\n\nЗ повагою,\n${ACC.name}`;
      persist();
    };
    $('#copy', view).onclick = async () => { try { await navigator.clipboard.writeText(ed.innerText); toast('Текст скопійовано'); } catch { toast('Не вдалося скопіювати — виділіть текст вручну', 'bad'); } };
    $('#dl', view).onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([ed.innerText || ''], { type: 'text/plain;charset=utf-8' })); a.download = `${t.id}.txt`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); };
  };

  /* ===================== LIBRARY (Supabase Storage) ===================== */
  function library() {
    const docs = ACC.docs; const exp = docs.filter(l => docDays(l) != null && docDays(l) < 15);
    return `<div class="ph"><div><h1>Бібліотека документів</h1><p>Файли компанії для заявок. Доступні лише учасникам вашої компанії.</p></div></div>
    ${exp.length ? `<div class="card note note--warn"><b>Спливає строк дії: ${exp.map(l => esc(l.name)).join(', ')}</b><p>Оновіть ці документи заздалегідь.</p></div>` : ''}
    <section class="card" style="margin-bottom:16px"><form id="upForm" class="filters" style="margin:0;align-items:end">
      <div class="field" style="flex:1;min-width:220px"><label for="upFile">Файл, до 25 МБ</label><input id="upFile" type="file" required style="padding:8px"></div>
      <div class="field"><label for="upType">Тип</label><select id="upType">${DOC_TYPES.map(x => `<option>${x}</option>`).join('')}</select></div>
      <div class="field"><label for="upValid">Дійсний до</label><input id="upValid" type="date"></div>
      <button class="btn btn--primary" type="submit" id="upBtn" style="height:42px">Завантажити</button></form></section>
    <div class="lib">${docs.map(l => { const d = docDays(l);
      return `<article class="libc"><div style="display:flex;gap:12px;align-items:flex-start"><span class="libc__ic">${esc(extOf(l.name))}</span><div style="min-width:0"><b style="word-break:break-word">${esc(l.name)}</b><div class="muted" style="font-size:12px;margin-top:4px">${esc(l.doc_type)} · ${sizeOf(l.size_bytes)} · ${fmtDate(new Date(l.created_at))}</div></div></div>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">${d == null ? '<span class="chip">Безстроковий</span>' : `<span class="chip ${d < 0 ? 'chip--bad' : d <= 14 ? 'chip--warn' : 'chip--good'}">${d < 0 ? 'Строк минув' : `Дійсний ще ${d} дн.`}</span>`}
        <span style="display:flex;gap:6px"><button class="icon-btn" type="button" data-open="${esc(l.id)}" aria-label="Відкрити ${esc(l.name)}">${ICON.down}</button><button class="icon-btn" type="button" data-rm="${esc(l.id)}" aria-label="Видалити ${esc(l.name)}">${ICON.trash}</button></span></div></article>`; }).join('') || '<div class="empty" style="grid-column:1/-1"><b>Бібліотека порожня</b>Почніть зі статуту, витягу з реєстру та довідки про відсутність заборгованості.</div>'}</div>`;
  }
  library.title = () => 'Бібліотека';
  library.mount = view => {
    const c = ACC.client;
    $('#upForm', view).onsubmit = async e => {
      e.preventDefault(); const f = $('#upFile', view).files[0]; if (!f) return;
      if (f.size > 25 * 1024 * 1024) { toast('Файл більший за 25 МБ', 'bad'); return; }
      const btn = $('#upBtn', view); btn.disabled = true; btn.textContent = 'Завантажуємо…';
      const safe = f.name.normalize('NFKD').replace(/[^\w.\-]+/g, '_').slice(-100) || 'file';
      const path = `${ACC.org.id}/${crypto.randomUUID()}-${safe}`;
      const up = await c.storage.from('org-documents').upload(path, f, { contentType: f.type || 'application/octet-stream', upsert: false });
      if (up.error) { toast('Не вдалося завантажити файл. Спробуйте ще раз.', 'bad'); btn.disabled = false; btn.textContent = 'Завантажити'; return; }
      const { data, error } = await c.from('documents').insert({ org_id: ACC.org.id, name: f.name.slice(0, 200), doc_type: $('#upType', view).value, valid_until: $('#upValid', view).value || null, path, size_bytes: f.size, mime: (f.type || '').slice(0, 120), uploaded_by: ACC.uid }).select().single();
      if (error) { await c.storage.from('org-documents').remove([path]); toast('Не вдалося зберегти документ.', 'bad'); btn.disabled = false; btn.textContent = 'Завантажити'; return; }
      ACC.docs.unshift(data); render(); toast('Документ додано');
    };
    $$('[data-open]', view).forEach(b => b.onclick = async () => { const d = ACC.docs.find(x => x.id === b.dataset.open); const w = window.open('', '_blank'); const { data, error } = await c.storage.from('org-documents').createSignedUrl(d.path, 120); if (error) { w && w.close(); toast('Не вдалося відкрити файл', 'bad'); return; } if (w) w.location = data.signedUrl; else location.href = data.signedUrl; });
    $$('[data-rm]', view).forEach(b => b.onclick = async () => { const d = ACC.docs.find(x => x.id === b.dataset.rm); if (!confirm(`Видалити «${d.name}»?`)) return;
      const r1 = await c.storage.from('org-documents').remove([d.path]); const r2 = await c.from('documents').delete().eq('id', d.id);
      if (r1.error || r2.error) { toast('Не вдалося видалити', 'bad'); return; } ACC.docs = ACC.docs.filter(x => x.id !== d.id); render(); toast('Документ видалено'); });
  };

  /* ===================== ANALYTICS ===================== */
  function analytics() {
    const out = Object.values(S.outcomes); const won = out.filter(x => x === 'won').length, lost = out.filter(x => x === 'lost').length;
    const pipeN = Object.keys(S.pipeline).length; const submitted = Object.values(S.pipeline).filter(x => ['submitted', 'result'].includes(x)).length;
    const reasons = {}; Object.values(S.dismissed).forEach(d => { const r = (d && d.r) || String(d); reasons[r] = (reasons[r] || 0) + 1; });
    const fit = matched();
    const byCountry = {}; fit.forEach(t => { const k = t.src === 'prozorro' ? 'Україна' : (t.cn || t.cc); byCountry[k] = (byCountry[k] || 0) + 1; });
    const byCat = {}; fit.forEach(t => { const k = t.cat || 'Інше'; (byCat[k] = byCat[k] || []).push(eurOf(t)); });
    const median = a => { a = a.filter(x => x != null).sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)] : null; };
    const bars = (rows, unit) => { if (!rows.length) return '<p class="muted">Даних поки немає.</p>'; const max = Math.max(...rows.map(r => r[1])) || 1; return `<svg class="chart" viewBox="0 0 440 ${rows.length * 34}" role="img">${rows.map((r, i) => `<g transform="translate(0 ${i * 34})"><text x="0" y="21">${esc(String(r[0]).slice(0, 18))}</text><rect x="140" y="8" width="${(220 * r[1] / max).toFixed(1)}" height="18" rx="5" fill="var(--verd-hi)" fill-opacity="${(.35 + .65 * r[1] / max).toFixed(2)}"/><text x="${148 + 220 * r[1] / max}" y="21" style="fill:var(--text)">${unit ? unit(r[1]) : nf.format(r[1])}</text></g>`).join('')}</svg>`; };
    return `<div class="ph"><div><h1>Аналітика</h1><p>Ваші результати з pipeline і ринок відкритих тендерів під ваш профіль.</p></div></div>
    <div class="grid g-kpi">
      <div class="card kpi kpi--hero"><small>Частка перемог</small><b class="num">${won + lost ? Math.round(won / (won + lost) * 100) + '%' : '—'}</b><span>${won} виграно, ${lost} ні</span></div>
      <div class="card kpi"><small>У pipeline</small><b class="num">${pipeN}</b><span>${submitted} подано</span></div>
      <div class="card kpi"><small>Підходящих відкритих</small><b class="num">${nf.format(fit.length)}</b><span>${eurShort(fit.reduce((a, t) => a + (eurOf(t) || 0), 0))}</span></div>
      <div class="card kpi"><small>Відхилено</small><b class="num">${Object.keys(S.dismissed).length}</b><span>тендерів</span></div>
    </div>
    <div class="grid g-main" style="margin-top:16px">
      <section class="card"><div class="card__head"><h2>Підходящі тендери за країнами</h2></div>${bars(Object.entries(byCountry).sort((a, b) => b[1] - a[1]).slice(0, 8))}</section>
      <section class="card"><div class="card__head"><h2>Медіанний бюджет за предметом</h2></div>${bars(Object.entries(byCat).map(([k, v]) => [k, median(v) || 0]).filter(r => r[1]), eurShort)}</section>
    </div>
    <section class="card" style="margin-top:16px"><div class="card__head"><h2>Чому ви відхиляєте тендери</h2></div>${bars(Object.entries(reasons).sort((a, b) => b[1] - a[1]))}
      <p class="muted" style="margin:8px 0 0">Якщо часто трапляється «Не наш профіль» — звузьте напрями в <a href="#/settings?tab=search">профілі пошуку</a>.</p></section>`;
  }
  analytics.title = () => 'Аналітика';

  /* ===================== SETTINGS ===================== */
  function settings(_, params) {
    const tab = params.tab || 'search'; const o = ACC.org; const admin = ACC.role !== 'member'; const dis = admin ? '' : ' disabled';
    const tabs = [['search', 'Профіль пошуку'], ['company', 'Компанія'], ['team', 'Команда'], ['account', 'Акаунт']];
    const bodies = {
      search: `<form class="form" id="srForm" style="max-width:760px">
        ${admin ? '' : '<p style="color:var(--warn);margin:0">Змінювати профіль пошуку можуть власник або адміністратор.</p>'}
        <fieldset class="fset"><legend>Напрями діяльності</legend><div class="tags">${Object.keys(TAX.INDUSTRIES).map(n => `<button type="button" class="fchip" data-ind="${esc(n)}" aria-pressed="${(o.industries || []).includes(n)}"${dis}>${esc(n)}</button>`).join('')}</div></fieldset>
        <div class="field"><label for="srCpv">Додаткові коди CPV <span class="muted">через кому, напр. 45261000, 09332000</span></label><input id="srCpv" value="${esc((o.cpv_codes || []).join(', '))}"${dis}></div>
        <fieldset class="fset"><legend>Де шукати</legend><div class="tags">${TAX.REGIONS.map(([k, n]) => `<button type="button" class="fchip" data-reg="${k}" aria-pressed="${(o.regions || []).includes(k)}"${dis}>${esc(n)}</button>`).join('')}</div></fieldset>
        <div class="field"><label for="srMin">Бюджет тендера, €</label><div style="display:flex;gap:8px"><input id="srMin" inputmode="numeric" placeholder="від" value="${o.budget_min ?? ''}"${dis}><input id="srMax" aria-label="Бюджет до, €" inputmode="numeric" placeholder="до" value="${o.budget_max ?? ''}"${dis}></div></div>
        <div class="field"><label for="srKw">Ключові слова <span class="muted">піднімають тендер у видачі</span></label><input id="srKw" value="${esc((o.keywords || []).join(', '))}" placeholder="покрівля, котельня, LED"${dis}></div>
        <div class="field"><label for="srEx">Слова-виключення <span class="muted">приховують тендер</span></label><input id="srEx" value="${esc((o.exclude_keywords || []).join(', '))}" placeholder="харчування, паливо"${dis}></div>
        ${admin ? '<div><button class="btn btn--primary" type="submit">Зберегти профіль пошуку</button></div>' : ''}</form>`,
      company: `<form class="form" id="coForm"><div class="field"><label for="coName">Назва</label><input id="coName" value="${esc(o.name)}" required minlength="2"${dis}></div>
        <div class="field"><label for="coCode">Реєстраційний код</label><input id="coCode" value="${esc(o.reg_code || '')}"${dis}></div>
        <div class="field"><label for="coSite">Сайт</label><input id="coSite" value="${esc(o.website || '')}" placeholder="https://"${dis}></div>
        <div class="field"><label for="coSize">Кількість працівників</label><select id="coSize"${dis}>${['', '1-10', '11-50', '51-250', '251-1000', '1000+'].map(s => `<option value="${s}"${(o.size || '') === s ? ' selected' : ''}>${s || '—'}</option>`).join('')}</select></div>
        <p class="muted" style="margin:0">Тариф: ${o.plan === 'trial' ? `пробний період до ${fmtDate(new Date(o.trial_ends_at))}` : esc(o.plan)}.</p>
        ${admin ? '<div><button class="btn btn--primary" type="submit">Зберегти</button></div>' : ''}</form>`,
      team: `<div class="form"><div class="card" style="padding:8px 16px">${ACC.team.map(m => `<div class="teamline"><span class="avatar avatar--sm">${esc(initials(m.name))}</span><div style="flex:1">${esc(m.name)}<small>${esc(m.role)}</small></div></div>`).join('')}
        ${ACC.invites.map(e => `<div class="teamline"><span class="avatar avatar--sm">${esc(e[0].toUpperCase())}</span><div style="flex:1">${esc(e)}<small>Очікує реєстрації</small></div>${admin ? `<button class="icon-btn" type="button" data-uninv="${esc(e)}" aria-label="Скасувати запрошення">${ICON.trash}</button>` : ''}</div>`).join('')}</div>
        ${admin ? `<form id="invForm" class="inline-form"><label class="sr-only" for="invEmail">Email колеги</label><input class="select" id="invEmail" type="email" required placeholder="email колеги"><button class="btn btn--primary" type="submit">Запросити</button></form>
        <p class="muted" style="margin:0">Колега реєструється з цим email — і автоматично потрапляє у вашу компанію.</p>` : ''}</div>`,
      account: `<form class="form" id="acForm"><div class="field"><label for="acName">Ім’я та прізвище</label><input id="acName" value="${esc(ACC.profile.full_name || '')}" required minlength="2"></div>
        <div class="field"><label for="acJob">Посада</label><input id="acJob" value="${esc(ACC.profile.job_title || '')}"></div>
        <div class="field"><label for="acMail">Email</label><input id="acMail" value="${esc(ACC.email)}" disabled></div>
        <div class="field"><span style="font-size:13px;color:var(--text-2)">Тема</span><div class="seg" role="group" aria-label="Тема"><button type="button" data-theme-set="dark" aria-pressed="${S.theme === 'dark'}">Темна</button><button type="button" data-theme-set="light" aria-pressed="${S.theme === 'light'}">Світла</button></div></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn--primary" type="submit">Зберегти</button><a class="btn btn--ghost" href="../auth/?mode=reset">Змінити пароль</a><button class="btn btn--danger" type="button" id="signOut2">Вийти</button></div></form>`
    };
    return `<div class="ph"><div><h1>Налаштування</h1><p>${esc(o.name)} · ${ROLE_UA[ACC.role]}</p></div></div>
      <div class="tabs" role="tablist">${tabs.map(([k, n]) => `<button type="button" role="tab" data-stab="${k}" aria-selected="${k === tab}">${n}</button>`).join('')}</div>${bodies[tab] || bodies.search}`;
  }
  settings.title = () => 'Налаштування';
  settings.mount = view => {
    const c = ACC.client; const list = v => v.split(',').map(s => s.trim()).filter(Boolean).slice(0, 40);
    $$('[data-stab]', view).forEach(b => b.onclick = () => { location.hash = '#/settings?tab=' + b.dataset.stab; });
    $$('[data-ind],[data-reg]', view).forEach(b => b.onclick = () => b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true')));
    $('#srForm', view)?.addEventListener('submit', async e => {
      e.preventDefault();
      const num = v => { const n = parseFloat(String(v).replace(/[\s ,]/g, '')); return isNaN(n) || n < 0 ? null : n; };
      const patch = { industries: $$('[data-ind][aria-pressed="true"]', view).map(b => b.dataset.ind), regions: $$('[data-reg][aria-pressed="true"]', view).map(b => b.dataset.reg),
        cpv_codes: list($('#srCpv', view).value).map(x => x.replace(/[^\d-]/g, '')).filter(x => x.length >= 2), budget_min: num($('#srMin', view).value), budget_max: num($('#srMax', view).value),
        keywords: list($('#srKw', view).value), exclude_keywords: list($('#srEx', view).value) };
      const { error } = await c.from('organizations').update(patch).eq('id', ACC.org.id);
      if (error) { toast('Не вдалося зберегти профіль', 'bad'); return; }
      Object.assign(ACC.org, patch); rescore(); paintAccount(); toast(`Профіль збережено. Підходить ${nf.format(matched().length)} відкритих тендерів.`); render();
    });
    $('#coForm', view)?.addEventListener('submit', async e => {
      e.preventDefault(); const patch = { name: $('#coName', view).value.trim(), reg_code: $('#coCode', view).value.trim() || null, website: $('#coSite', view).value.trim() || null, size: $('#coSize', view).value || null };
      const { error } = await c.from('organizations').update(patch).eq('id', ACC.org.id);
      if (error) { toast('Не вдалося зберегти', 'bad'); return; } Object.assign(ACC.org, patch); paintAccount(); toast('Збережено');
    });
    $('#invForm', view)?.addEventListener('submit', async e => {
      e.preventDefault(); const email = $('#invEmail', view).value.trim().toLowerCase();
      const { error } = await c.from('invitations').insert({ org_id: ACC.org.id, email, invited_by: ACC.uid });
      if (error) { toast(/duplicate|unique/i.test(error.message) ? 'Цю людину вже запрошено' : 'Не вдалося додати запрошення', 'bad'); return; }
      ACC.invites.push(email); render(); toast('Запрошення додано');
    });
    $$('[data-uninv]', view).forEach(b => b.onclick = async () => { const { error } = await c.from('invitations').delete().eq('org_id', ACC.org.id).eq('email', b.dataset.uninv); if (error) { toast('Не вдалося скасувати', 'bad'); return; } ACC.invites = ACC.invites.filter(x => x !== b.dataset.uninv); render(); });
    $('#acForm', view)?.addEventListener('submit', async e => {
      e.preventDefault(); const patch = { full_name: $('#acName', view).value.trim(), job_title: $('#acJob', view).value.trim() || null };
      const { error } = await c.from('profiles').update(patch).eq('id', ACC.uid);
      if (error) { toast('Не вдалося зберегти', 'bad'); return; } Object.assign(ACC.profile, patch); ACC.name = patch.full_name; ACC.firstName = patch.full_name.split(' ')[0]; paintAccount(); toast('Збережено');
    });
    $$('[data-theme-set]', view).forEach(b => b.onclick = () => { setTheme(b.dataset.themeSet); render(); });
    $('#signOut2', view)?.addEventListener('click', signOut);
  };

  /* ---------- shell: theme, menu, notifications, palette ---------- */
  function setTheme(t) { S.theme = t; local.set('theme', t); document.documentElement.dataset.theme = t; $('meta[name="theme-color"]').content = t === 'dark' ? '#0B1A26' : '#EEF1EC'; }
  $('#themeBtn').onclick = () => { setTheme(S.theme === 'dark' ? 'light' : 'dark'); render(); };
  $('#menuBtn').onclick = () => { const o = !$('#side').classList.contains('is-open'); $('#side').classList.toggle('is-open', o); $('#menuBtn').setAttribute('aria-expanded', String(o)); };
  const pops = [['#bellBtn', '#bellPop'], ['#meBtn', '#mePop']];
  pops.forEach(([b, p]) => { $(b).onclick = e => { e.stopPropagation(); const el = $(p); const open = el.hidden; pops.forEach(([bb, q]) => { $(q).hidden = true; $(bb).setAttribute('aria-expanded', 'false'); }); el.hidden = !open; $(b).setAttribute('aria-expanded', String(open)); if (b === '#bellBtn' && open) { local.set('seen', Date.now()); $('.dot', $(b))?.remove(); } }; });
  document.addEventListener('click', e => pops.forEach(([b, p]) => { const el = $(p); if (!el.hidden && !el.contains(e.target)) { el.hidden = true; $(b).setAttribute('aria-expanded', 'false'); } }));
  $('#orgBtn').onclick = () => { location.hash = '#/settings?tab=company'; };
  $('#signOut').onclick = signOut;
  async function signOut() { await AUTH.client.auth.signOut(); location.replace(AUTH.siteRoot() + 'auth/?mode=login'); }
  function paintAccount() {
    const o = ACC.org; $('#orgName').textContent = o.name;
    $('#orgLogo').textContent = initials(o.name.replace(/^(ТОВ|ПП|ФОП|ПрАТ|АТ|КП|Sp\. z o\.o\.|GmbH)\s*/i, '').replace(/[«»"']/g, ''));
    const days = Math.max(0, Math.ceil((new Date(o.trial_ends_at) - Date.now()) / 864e5));
    $('#orgPlan').textContent = o.plan === 'trial' ? `Пробний період · ${days} ${plural(days, 'день', 'дні', 'днів')}` : `Тариф ${o.plan[0].toUpperCase() + o.plan.slice(1)}`;
    $('#meName').textContent = ACC.name; $('#meMail').textContent = ACC.email; $('#meBtn').textContent = initials(ACC.name); $('#meBtn').title = ACC.name;
    const M = DATA.meta; $('#freshPill').textContent = M && M.generatedAt ? `Оновлено ${ago(M.generatedAt)}` : 'Дані оновлюються';
    $('#freshPill').title = M && M.counts ? `Відкритих тендерів: Prozorro ${nf.format(M.counts.ua)}, TED ${nf.format(M.counts.eu)}` : '';
    const n = matched().filter(t => t.pub && Date.now() - Date.parse(t.pub) < 864e5).length; $('#newCount').textContent = n; $('#newCount').hidden = !n;
  }
  function paintBell() {
    const items = [];
    const seen = local.get('seen', 0); const fresh = seen ? matched().filter(t => t.pub && Date.parse(t.pub) > seen).length : 0;
    if (fresh) items.push(`<a href="#/tenders?sort=fresh" class="pop__item"><b>${fresh} ${plural(fresh, 'новий тендер', 'нові тендери', 'нових тендерів')} для вас</b><span>з часу останнього перегляду</span></a>`);
    inPipe().filter(t => !['submitted', 'result'].includes(S.pipeline[t.id]) && daysLeft(t) != null && daysLeft(t) >= 0 && daysLeft(t) <= 3).forEach(t => items.push(`<a href="${href(t)}" class="pop__item"><b>Дедлайн ${dlText(daysLeft(t))}</b><span>${esc(titleOf(t).slice(0, 70))}</span></a>`));
    ACC.docs.filter(l => docDays(l) != null && docDays(l) < 15).forEach(l => items.push(`<a href="#/library" class="pop__item"><b>${docDays(l) < 0 ? 'Строк дії документа минув' : 'Спливає документ'}</b><span>${esc(l.name)}</span></a>`));
    $('#bellList').innerHTML = items.join('') || '<p class="muted" style="margin:6px 10px 10px">Нових сповіщень немає.</p>';
    if (items.length) $('#bellBtn').insertAdjacentHTML('beforeend', '<i class="dot"></i>');
  }
  const pal = $('#palette'), pin = $('#paletteInput'), plist = $('#paletteList');
  const NAV = [['Огляд', '#/'], ['Тендери', '#/tenders'], ['Pipeline', '#/pipeline'], ['Заявки', '#/bid'], ['Бібліотека документів', '#/library'], ['Аналітика', '#/analytics'], ['Профіль пошуку', '#/settings?tab=search'], ['Команда', '#/settings?tab=team'], ['Акаунт', '#/settings?tab=account']];
  let sel = 0, shown = [];
  function openPal() { pal.hidden = false; pin.value = ''; drawPal(); pin.focus(); }
  const closePal = () => { pal.hidden = true; };
  function drawPal() {
    const q = pin.value.trim().toLowerCase();
    const nav = NAV.filter(([n]) => !q || n.toLowerCase().includes(q)).map(([n, go]) => ({ label: n, hint: 'Розділ', go }));
    const ts = q.length >= 2 ? DATA.items.filter(t => (t.t + ' ' + t.b + ' ' + t.id).toLowerCase().includes(q)).sort((a, b) => (b._s ? b._s.s : 0) - (a._s ? a._s.s : 0)).slice(0, 8).map(t => ({ label: titleOf(t), hint: `${t.cc}${t._s ? ' · ' + t._s.s : ''}`, go: href(t) })) : [];
    shown = nav.concat(ts).slice(0, 14); sel = 0;
    plist.innerHTML = shown.map((c, i) => `<li role="option" id="po-${i}" aria-selected="${i === sel}" data-i="${i}"><span>${esc(c.label)}</span><small>${esc(c.hint)}</small></li>`).join('') || '<li>Нічого не знайдено</li>';
  }
  const runPal = i => { const c = shown[i]; if (!c) return; closePal(); location.hash = c.go; };
  $('#searchBtn').onclick = openPal; pin.addEventListener('input', drawPal);
  plist.addEventListener('click', e => { const li = e.target.closest('[data-i]'); if (li) runPal(+li.dataset.i); });
  pal.addEventListener('click', e => { if (e.target === pal) closePal(); });
  addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); pal.hidden ? openPal() : closePal(); return; }
    if (pal.hidden) return;
    if (e.key === 'Escape') closePal();
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + shown.length) % Math.max(1, shown.length); $$('li', plist).forEach((li, i) => li.setAttribute('aria-selected', String(i === sel))); pin.setAttribute('aria-activedescendant', 'po-' + sel); }
    if (e.key === 'Enter') { e.preventDefault(); runPal(sel); }
  });

  /* ---------- boot ---------- */
  function rescore() { P = buildProfile(ACC.org); DATA.items.forEach(t => { t._s = score(t); }); }
  async function loadData() {
    const get = async f => { const r = await fetch(`../data/${f}`, { cache: 'no-cache' }); if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); };
    const [meta, ua, eu] = await Promise.allSettled([get('meta.json'), get('tenders-ua.json'), get('tenders-eu.json')]);
    DATA.meta = meta.status === 'fulfilled' ? meta.value : null;
    const now = Date.now();
    const items = [].concat(ua.status === 'fulfilled' ? ua.value.items : [], eu.status === 'fulfilled' ? eu.value.items : []).filter(t => t && t.id && t.end && Date.parse(t.end) > now);
    items.forEach(t => { t.cpv = t.cpv || []; });
    DATA.items = items; DATA.byId = new Map(items.map(t => [t.id, t]));
    if (!items.length) DATA.error = 'Оновлення з Prozorro і TED запускається автоматично щогодини. Якщо сайт щойно опубліковано, перше оновлення займе до 15 хвилин.';
  }
  async function loadAccount(session) {
    const c = AUTH.client, uid = session.user.id;
    const [{ data: prof }, { data: mem, error }] = await Promise.all([
      c.from('profiles').select('*').eq('id', uid).maybeSingle(),
      c.from('organization_members').select('role, created_at, organizations(*)').eq('user_id', uid).order('created_at').limit(1)
    ]);
    if (error) throw error;
    const name = (prof && prof.full_name) || session.user.email.split('@')[0];
    ACC = { client: c, uid, email: session.user.email, profile: prof || {}, name, firstName: name.split(' ')[0], team: [], invites: [], docs: [] };
    if (!mem || !mem.length || !mem[0].organizations) return false;
    ACC.org = mem[0].organizations; ACC.role = mem[0].role;
    const [st, team, inv, docs] = await Promise.all([
      c.from('org_state').select('data').eq('org_id', ACC.org.id).maybeSingle(),
      c.from('organization_members').select('role, user_id, profiles(full_name, job_title)').eq('org_id', ACC.org.id),
      ACC.role === 'member' ? Promise.resolve({ data: [] }) : c.from('invitations').select('email').eq('org_id', ACC.org.id),
      c.from('documents').select('*').eq('org_id', ACC.org.id).order('created_at', { ascending: false })
    ]);
    const data = (st.data && st.data.data) || {};
    SYNC.forEach(k => { if (data[k] && typeof data[k] === 'object' && !Array.isArray(data[k])) S[k] = data[k]; });
    ACC.team = (team.data || []).map(m => ({ name: (m.profiles && m.profiles.full_name) || (m.user_id === uid ? name : 'Учасник'), role: (m.profiles && m.profiles.job_title) || ROLE_UA[m.role] }));
    ACC.invites = (inv.data || []).map(i => i.email); ACC.docs = docs.error ? [] : (docs.data || []);
    return true;
  }
  function createOrgModal() {
    const box = $('#onb'); box.hidden = false;
    box.innerHTML = `<div class="onb__box onb__box--narrow"><div class="onb__body"><h2 id="onbTitle">Додайте вашу компанію</h2><p>Акаунт є, але він ще не прив’язаний до компанії.</p>
      <form class="form" id="coNew"><div class="field"><label for="nName">Назва компанії</label><input id="nName" required minlength="2" autocomplete="organization"></div>
      <div class="field"><label for="nCountry">Країна</label><select id="nCountry"><option value="UA">Україна</option><option value="PL">Польща</option><option value="DE">Німеччина</option><option value="LT">Литва</option><option value="RO">Румунія</option><option value="XX">Інша</option></select></div>
      <div class="field"><label for="nCode">Реєстраційний код</label><input id="nCode"></div>
      <div class="onb__foot"><button class="btn btn--ghost" type="button" id="nOut">Вийти</button><button class="btn btn--primary btn--lg" type="submit">Створити компанію</button></div></form></div></div>`;
    $('#nOut').onclick = signOut;
    $('#coNew').onsubmit = async e => { e.preventDefault(); const { error } = await AUTH.client.rpc('create_organization', { p_name: $('#nName').value.trim(), p_country: $('#nCountry').value, p_reg_code: $('#nCode').value.trim() || null }); if (error) { toast('Не вдалося створити компанію', 'bad'); return; } location.reload(); };
  }
  function fatal(title, text) { document.body.classList.remove('booting'); $('#view').innerHTML = `<div class="empty" style="margin-top:10vh"><b>${title}</b>${text}</div>`; }
  async function boot() {
    if (!AUTH || !AUTH.configured) { fatal('Сервіс налаштовується', 'Вхід тимчасово недоступний. Спробуйте трохи пізніше.'); return; }
    const qs = new URLSearchParams(location.search);
    const { data: { session } } = await AUTH.client.auth.getSession();
    if (!session) { location.replace(AUTH.siteRoot() + 'auth/?mode=login&reason=session' + (location.hash.length > 2 ? '&next=' + encodeURIComponent(location.hash) : '')); return; }
    let ok;
    try { [ok] = await Promise.all([loadAccount(session), loadData()]); }
    catch { fatal('Не вдалося завантажити дані компанії', 'Перевірте з’єднання і оновіть сторінку.<br><br><button class="btn btn--primary" type="button" onclick="location.reload()">Оновити</button>'); return; }
    AUTH.client.auth.onAuthStateChange(ev => { if (ev === 'SIGNED_OUT') location.replace(AUTH.siteRoot() + 'auth/?mode=login'); });
    if (!ok) { document.body.classList.remove('booting'); createOrgModal(); return; }
    rescore(); paintAccount(); paintBell(); document.body.classList.remove('booting'); render();
    if (qs.has('welcome')) toast(`Вітаємо в Tendera, ${esc(ACC.firstName)}! Компанію «${esc(ACC.org.name)}» створено.`);
    if (qs.toString()) history.replaceState(null, '', location.pathname + location.hash);
  }
  boot();
})();

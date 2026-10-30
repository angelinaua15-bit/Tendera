/* Tendera — app (vanilla JS, hash router). Demo data lives in data.js. */
(() => {
  'use strict';
  const D = window.TENDERA;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nf = new Intl.NumberFormat('uk-UA');
  const eur = v => '€' + nf.format(Math.round(v));
  const eurM = v => v >= 1e6 ? '€' + (v / 1e6).toLocaleString('uk-UA', { maximumFractionDigits: 2 }) + ' млн' : '€' + nf.format(Math.round(v / 1000)) + ' тис.';
  const uah = v => '₴ ' + nf.format(Math.round(v * D.UAH / 1000) * 1000);
  const money = t => t.country === 'UA' ? uah(t.value) : eur(t.value);
  const MONTHS = ['січ', 'лют', 'бер', 'кві', 'тра', 'чер', 'лип', 'сер', 'вер', 'жов', 'лис', 'гру'];
  const now = new Date();
  const dateIn = d => { const x = new Date(now); x.setDate(x.getDate() + d); x.setHours(17, 0, 0, 0); return x; };
  const fmtDate = d => `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  const dlCls = d => d <= 10 ? 'dl--urgent' : d <= 18 ? 'dl--soon' : '';
  const dlText = d => d === 1 ? 'завтра' : `через ${d} ${plural(d, 'день', 'дні', 'днів')}`;
  function plural(n, a, b, c) { const m10 = n % 10, m100 = n % 100; if (m10 === 1 && m100 !== 11) return a; if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return b; return c; }
  const byId = id => D.TENDERS.find(t => t.id === id);
  const titleOf = t => t.titleUa || t.title;
  const photo = t => D.PHOTOS[t.category] || D.PHOTOS.office;
  const scoreColor = s => s >= 75 ? 'var(--good)' : s >= 55 ? 'var(--warn)' : 'var(--bad)';
  const VERDICT = { bid: 'Рекомендуємо подаватись', consider: 'Варто розглянути', skip: 'Краще пропустити' };

  /* ---------- persistent state ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem('tendera.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('tendera.' + k, JSON.stringify(v)); } catch { /* storage unavailable */ } }
  };
  const S = {
    pipeline: store.get('pipeline', { ...D.PIPELINE_DEFAULT }),
    dismissed: store.get('dismissed', {}),
    saved: store.get('saved', {}),
    checks: store.get('checks', {}),
    drafts: store.get('drafts', {}),
    uploads: store.get('uploads', []),
    invites: store.get('invites', []),
    theme: store.get('theme', 'dark'),
    onboarded: store.get('onboarded', false),
    view: store.get('view', 'cards')
  };
  /* ---------- real account (Supabase) ---------- */
  const SYNC_KEYS = ['pipeline', 'dismissed', 'saved', 'checks', 'drafts'];
  let ACC = null; // { client, uid, email, profile, org, role, invites }
  let syncTimer = 0;
  const save = k => { if (ACC && SYNC_KEYS.includes(k)) scheduleSync(); else store.set(k, S[k]); };
  function scheduleSync() {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(async () => {
      const data = Object.fromEntries(SYNC_KEYS.map(k => [k, S[k]]));
      const { error } = await ACC.client.from('org_state').upsert({ org_id: ACC.org.id, data, updated_by: ACC.uid });
      if (error) toast('Не вдалося зберегти зміни. Перевірте з’єднання і повторіть дію.');
    }, 700);
  }
  const initials = n => (n || '?').trim().split(/[\s-]+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?';
  const ROLE_UA = { owner: 'Власник', admin: 'Адміністратор', member: 'Учасник' };
  document.documentElement.dataset.theme = S.theme;

  /* ---------- small components ---------- */
  function ring(score, size = 52) {
    const r = size === 52 ? 22 : 52, c = 2 * Math.PI * r, w = size === 52 ? 4 : 7;
    return `<div class="ring${size !== 52 ? ' ring--lg' : ''}" aria-label="Збіг ${score} зі 100"><svg viewBox="0 0 ${size} ${size}"><circle class="bg" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${w}"/><circle class="fg" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${w}" stroke="${scoreColor(score)}" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${c.toFixed(2)}" data-off="${(c * (1 - score / 100)).toFixed(2)}"/></svg><b class="num">${score}</b></div>`;
  }
  const lp = (src, alt = '') => `<div class="lp"><img src="${src}" alt="${esc(alt)}" loading="lazy"></div>`;
  const srcChip = t => `<span class="chip chip--src">${esc(t.source)}</span>`;
  const verdictChip = t => `<span class="chip ${t.verdict === 'bid' ? 'chip--good' : t.verdict === 'consider' ? 'chip--warn' : 'chip--bad'}">${VERDICT[t.verdict]}</span>`;
  const ICON = {
    ok: '<svg viewBox="0 0 24 24"><path d="m5 12 5 5 9-10"/></svg>',
    missing: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M12 7v6M12 17h.01"/></svg>',
    spark: '<svg viewBox="0 0 24 24"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/></svg>',
    down: '<svg viewBox="0 0 24 24"><path d="M12 4v12M6 10l6 6 6-6M4 20h16"/></svg>',
    copy: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>'
  };
  function animateRings(root = document) {
    requestAnimationFrame(() => setTimeout(() => $$('.ring .fg', root).forEach(c => { c.style.strokeDashoffset = c.dataset.off; }), 60));
  }
  function countUp(el, to, fmt = v => nf.format(Math.round(v)), dur = 1400) {
    if (!el) return;
    if (reduced) { el.textContent = fmt(to); return; }
    const t0 = performance.now();
    const step = t => { const k = Math.min(1, (t - t0) / dur); el.textContent = fmt(to * (1 - Math.pow(1 - k, 4))); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  function toast(html) {
    const el = document.createElement('div'); el.className = 'toast'; el.innerHTML = html;
    $('#toasts').append(el); setTimeout(() => { el.style.transition = 'opacity .4s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 400); }, 3600);
  }
  // broken remote photos fade to the gradient underneath
  document.addEventListener('error', e => { if (e.target.tagName === 'IMG') e.target.classList.add('is-broken'); }, true);

  function trow(t) {
    return `<a class="trow" href="#/tender/${t.id}">
      ${ring(t.match)}
      <div><div class="trow__title">${esc(titleOf(t))}</div>
        <div class="trow__meta"><span class="cc">${t.country}</span><span>${esc(t.buyer)}</span><span>${esc(t.source)}</span></div></div>
      <div class="trow__side"><span class="trow__value num">${money(t)}</span><span class="dl ${dlCls(t.deadline)}">${dlText(t.deadline)}</span></div></a>`;
  }
  function tcard(t) {
    return `<a class="tcard" href="#/tender/${t.id}">
      <div class="tcard__media"><div class="lp"><img src="${photo(t)}" alt="" loading="lazy"></div><span class="tcard__src">${esc(t.source)} · ${t.country}</span><span class="tcard__score">${ring(t.match)}</span></div>
      <div class="tcard__body">
        <div class="trow__title">${esc(titleOf(t))}</div>
        <div class="trow__meta"><span>${esc(t.buyer)}</span><span>${esc(t.cityName)}</span></div>
        <div>${verdictChip(t)}</div>
        <div class="tcard__foot"><span class="trow__value num">${money(t)}</span><span class="dl ${dlCls(t.deadline)}">${dlText(t.deadline)}</span></div>
      </div></a>`;
  }

  /* ---------- router ---------- */
  const routes = { '': overview, tenders, tender, pipeline, bid, library, analytics, settings };
  let cleanup = [];
  function onCleanup(fn) { cleanup.push(fn); }
  function render() {
    cleanup.forEach(f => f()); cleanup = [];
    const raw = location.hash.replace(/^#\/?/, '');
    const [path, query = ''] = raw.split('?');
    const [name = '', arg] = path.split('/');
    const params = Object.fromEntries(new URLSearchParams(query));
    const view = $('#view');
    const fn = routes[name] || overview;
    view.innerHTML = fn(arg, params) || '';
    view.classList.remove('is-entering'); void view.offsetWidth; view.classList.add('is-entering');
    (fn.mount || (() => { }))(view, arg, params);
    animateRings(view);
    $$('.side__nav a').forEach(a => a.classList.toggle('is-active', a.dataset.route === (name || 'overview')));
    $('#side').classList.remove('is-open'); $('#menuBtn').setAttribute('aria-expanded', 'false');
    document.title = (fn.title ? fn.title(arg) + ' — ' : '') + 'Tendera';
    if (!render.first) view.focus({ preventScroll: true });
    render.first = false; scrollTo({ top: 0 });
  }
  render.first = true;
  addEventListener('hashchange', render);

  /* ===================== OVERVIEW ===================== */
  function overview() {
    const fit = D.TENDERS.filter(t => t.verdict !== 'skip' && !S.dismissed[t.id]);
    const sum = fit.reduce((a, t) => a + t.value, 0);
    const fresh = D.TENDERS.filter(t => t.published <= 12).length;
    const soon = D.TENDERS.filter(t => t.deadline <= 14 && t.verdict !== 'skip').length;
    const top = [...fit].sort((a, b) => b.match - a.match).slice(0, 5);
    const deadlines = [...D.TENDERS].filter(t => S.pipeline[t.id] && S.pipeline[t.id] !== 'result').sort((a, b) => a.deadline - b.deadline).slice(0, 6);
    const hour = now.getHours();
    const hi = hour < 12 ? 'Доброго ранку' : hour < 18 ? 'Доброго дня' : 'Доброго вечора';
    return `
    <section class="hello">${lp(D.PHOTOS.office, '')}
      <div class="hello__in">
        <div><div class="greet">${hi}, ${esc(D.USER.name.split(' ')[0])}.</div>
        <p>За ніч ми прочитали ${nf.format(1284)} нових оголошень у ${Object.keys(D.COUNTRIES).length} країнах. Для вашої компанії відібрано ${fresh} нових тендерів.</p></div>
        <div class="hello__meta"><div><small>Наступний дайджест</small><b>завтра, 8:00</b></div><div><small>Профіль</small><b>5 CPV, 3 регіони</b></div></div>
      </div></section>
    <div class="grid g-kpi">
      <div class="card kpi kpi--hero"><small>Сума підходящих тендерів</small><b class="num" id="kSum">€0</b><span>${fit.length} відкритих можливостей</span></div>
      <div class="card kpi"><small>Нові за 12 годин</small><b class="num" id="kNew">0</b><span>+${fresh} з учора</span></div>
      <div class="card kpi"><small>Дедлайни за 14 днів</small><b class="num" id="kSoon">0</b><span style="background:var(--warn-bg);color:var(--warn)">потребують рішення</span></div>
      <div class="card kpi"><small>Перемоги за пів року</small><b class="num">9 з 28</b><span>32% win rate</span></div>
    </div>
    <div class="grid g-main" style="margin-top:16px">
      <section class="card"><div class="card__head"><h2>Найкращі збіги на сьогодні</h2><a href="#/tenders">Усі тендери</a></div><div class="tlist">${top.map(trow).join('')}</div></section>
      <section class="card mapcard"><div class="card__head"><h2>Де ваші можливості</h2><a href="#/tenders?view=cards">Список</a></div>
        <canvas id="miniMap" role="img" aria-label="Карта тендерів, натисніть точку, щоб відкрити тендер"></canvas>
        <div class="legend"><span><i style="background:var(--brass)"></i>Україна</span><span><i style="background:var(--verd-hi)"></i>ЄС</span></div></section>
    </div>
    <div class="grid g-main" style="margin-top:16px">
      <section class="card"><div class="card__head"><h2>Pipeline за етапами</h2><a href="#/pipeline">Відкрити</a></div>${pipelineChart()}</section>
      <section class="card"><div class="card__head"><h2>Найближчі дедлайни</h2><a href="#/pipeline">Pipeline</a></div>
        <div class="tl">${deadlines.map(t => `<div class="tl__row"><span class="tl__day num">${fmtDate(dateIn(t.deadline))}</span><span class="tl__dot ${t.deadline <= 10 ? 'urgent' : t.deadline <= 18 ? 'soon' : ''}"></span><div><a href="#/tender/${t.id}">${esc(titleOf(t))}</a><small>${D.STAGES.find(s => s.id === S.pipeline[t.id]).name} · ${money(t)}</small></div></div>`).join('') || '<p class="empty">Додайте тендери в pipeline, і тут з’являться дедлайни.</p>'}</div></section>
    </div>`;
  }
  overview.title = () => 'Огляд';
  overview.mount = view => {
    const fit = D.TENDERS.filter(t => t.verdict !== 'skip' && !S.dismissed[t.id]);
    countUp($('#kSum', view), fit.reduce((a, t) => a + t.value, 0), eur, 1800);
    countUp($('#kNew', view), D.TENDERS.filter(t => t.published <= 12).length);
    countUp($('#kSoon', view), D.TENDERS.filter(t => t.deadline <= 14 && t.verdict !== 'skip').length);
    miniMap($('#miniMap', view));
  };
  function pipelineChart() {
    const data = D.STAGES.map(s => ({ s, v: D.TENDERS.filter(t => S.pipeline[t.id] === s.id).reduce((a, t) => a + t.value, 0), n: D.TENDERS.filter(t => S.pipeline[t.id] === s.id).length }));
    const max = Math.max(1, ...data.map(d => d.v)); const W = 560, rowH = 40;
    return `<svg class="chart" viewBox="0 0 ${W} ${data.length * rowH + 4}" role="img" aria-label="Сума тендерів на кожному етапі pipeline">${data.map((d, i) => {
      const w = Math.max(4, (W - 230) * d.v / max);
      return `<g transform="translate(0 ${i * rowH})"><text x="0" y="24">${d.s.name}</text><rect x="110" y="10" width="${w}" height="20" rx="5" fill="${i === 2 ? 'var(--verd-hi)' : 'var(--verd)'}" fill-opacity="${i === 2 ? 1 : .55}"><animate attributeName="width" from="0" to="${w}" dur=".9s" fill="freeze" calcMode="spline" keySplines=".16 1 .3 1"/></rect><text x="${118 + w}" y="24" style="fill:var(--text)">${d.v ? eurM(d.v) : '—'} · ${d.n}</text></g>`;
    }).join('')}</svg>`;
  }
  function miniMap(canvas) {
    if (!canvas || !window.EUROPE) return;
    const E = window.EUROPE, ctx = canvas.getContext('2d');
    const pins = D.TENDERS.filter(t => t.verdict !== 'skip').map((t, i) => { const c = E.cities[t.city] || [500, 400]; return { t, x: c[0] + ((i * 37) % 17 - 8), y: c[1] + ((i * 53) % 15 - 7) }; });
    let W, H, k, dpr, raf = 0, hover = null;
    const dotCol = getComputedStyle(document.documentElement).getPropertyValue('--text-3').trim();
    let base = null;
    function size() {
      const r = canvas.getBoundingClientRect(); dpr = Math.min(2, devicePixelRatio || 1); W = r.width; H = r.height; canvas.width = W * dpr; canvas.height = H * dpr; k = W / E.w;
      base = document.createElement('canvas'); base.width = Math.max(1, W * dpr); base.height = Math.max(1, H * dpr);
      const b = base.getContext('2d'); b.scale(dpr, dpr); b.globalAlpha = .38; b.fillStyle = dotCol; b.beginPath(); const rr = Math.max(.8, 1.9 * k);
      for (let i = 0; i < E.dots.length; i += 2) { const x = E.dots[i] * k, y = E.dots[i + 1] * k; b.moveTo(x + rr, y); b.arc(x, y, rr, 0, 6.283); }
      b.fill();
    }
    function draw(t) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      if (base) ctx.drawImage(base, 0, 0, W, H);
      pins.forEach((p, i) => {
        const x = p.x * k, y = p.y * k, ua = p.t.country === 'UA';
        const col = ua ? '200,164,106' : '111,209,191';
        const ph = reduced ? 0 : ((t / 1000 + i * .37) % 2.6) / 2.6;
        if (!reduced) { ctx.strokeStyle = `rgba(${col},${.7 * (1 - ph)})`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, y, 4 + ph * 22, 0, 6.283); ctx.stroke(); }
        ctx.fillStyle = `rgba(${col},1)`; ctx.beginPath(); ctx.arc(x, y, hover === p ? 6 : 4, 0, 6.283); ctx.fill();
      });
      if (hover) {
        const x = hover.x * k, y = hover.y * k, label = `${titleOf(hover.t).slice(0, 34)}${titleOf(hover.t).length > 34 ? '…' : ''}`;
        ctx.font = '500 12px Geist, sans-serif'; const tw = ctx.measureText(label).width + 20;
        const bx = Math.min(Math.max(8, x - tw / 2), W - tw - 8), by = y - 40;
        ctx.fillStyle = 'rgba(10,24,35,.92)'; ctx.beginPath(); ctx.roundRect(bx, by, tw, 26, 8); ctx.fill();
        ctx.fillStyle = '#EDF0EA'; ctx.fillText(label, bx + 10, by + 17);
      }
    }
    function loop(t) { draw(t); raf = requestAnimationFrame(loop); }
    size(); reduced ? draw(0) : (raf = requestAnimationFrame(loop));
    const pick = e => { const r = canvas.getBoundingClientRect(); const mx = e.clientX - r.left, my = e.clientY - r.top; let best = null, bd = 16; pins.forEach(p => { const d = Math.hypot(p.x * k - mx, p.y * k - my); if (d < bd) { bd = d; best = p; } }); return best; };
    canvas.addEventListener('pointermove', e => { hover = pick(e); canvas.style.cursor = hover ? 'pointer' : 'default'; if (reduced) draw(0); });
    canvas.addEventListener('pointerleave', () => { hover = null; if (reduced) draw(0); });
    canvas.addEventListener('click', e => { const p = pick(e); if (p) location.hash = '#/tender/' + p.t.id; });
    let lastW = 0; const ro = new ResizeObserver(() => { const w = Math.round(canvas.getBoundingClientRect().width); if (Math.abs(w - lastW) < 2) return; lastW = w; size(); if (reduced) draw(0); }); ro.observe(canvas);
    onCleanup(() => { cancelAnimationFrame(raf); ro.disconnect(); });
  }

  /* ===================== TENDERS ===================== */
  const F = { q: '', countries: new Set(), verdict: 'all', sort: 'match', max: 8000000, hideSkip: true };
  function tenders(_, params) {
    if (params.view) S.view = params.view;
    const countries = [...new Set(D.TENDERS.map(t => t.country))];
    return `
    <div class="ph"><div><h1>Тендери</h1><p>Відібрано для профілю «${esc(D.COMPANY.name)}». Оновлено ${now.getHours()}:${String(Math.floor(now.getMinutes() / 30) * 30).padStart(2, '0')}.</p></div>
      <div class="ph__actions"><div class="seg" role="group" aria-label="Вигляд"><button type="button" data-view="cards" aria-pressed="${S.view === 'cards'}">Картки</button><button type="button" data-view="table" aria-pressed="${S.view === 'table'}">Таблиця</button></div>
      <button class="btn btn--ghost" type="button" id="saveSearch">Зберегти пошук</button></div></div>
    <div class="filters">
      <input class="select" style="min-width:220px" type="search" id="fq" placeholder="Пошук у назвах і замовниках" value="${esc(F.q)}" aria-label="Пошук">
      <div class="seg" role="group" aria-label="Вердикт">
        <button type="button" data-verdict="all" aria-pressed="${F.verdict === 'all'}">Усі</button>
        <button type="button" data-verdict="bid" aria-pressed="${F.verdict === 'bid'}">Подаватись</button>
        <button type="button" data-verdict="consider" aria-pressed="${F.verdict === 'consider'}">Розглянути</button>
      </div>
      ${countries.map(c => `<button type="button" class="fchip" data-country="${c}" aria-pressed="${F.countries.has(c)}">${c}</button>`).join('')}
      <label class="range">Бюджет до <b class="num" id="maxLbl">${eurM(F.max)}</b><input type="range" id="fmax" min="500000" max="8000000" step="250000" value="${F.max}"></label>
      <select class="select" id="fsort" aria-label="Сортування">
        <option value="match"${F.sort === 'match' ? ' selected' : ''}>За збігом</option>
        <option value="deadline"${F.sort === 'deadline' ? ' selected' : ''}>За дедлайном</option>
        <option value="value"${F.sort === 'value' ? ' selected' : ''}>За бюджетом</option>
        <option value="fresh"${F.sort === 'fresh' ? ' selected' : ''}>Найновіші</option>
      </select>
      <label class="range"><input type="checkbox" id="fskip" ${F.hideSkip ? 'checked' : ''}> Сховати «пропустити»</label>
    </div>
    <div id="results"></div>`;
  }
  tenders.title = () => 'Тендери';
  tenders.mount = view => {
    const out = $('#results', view);
    function apply() {
      const q = F.q.trim().toLowerCase();
      let list = D.TENDERS.filter(t => !S.dismissed[t.id]
        && (!q || (titleOf(t) + ' ' + t.title + ' ' + t.buyer + ' ' + t.cpvName).toLowerCase().includes(q))
        && (!F.countries.size || F.countries.has(t.country))
        && (F.verdict === 'all' || t.verdict === F.verdict)
        && t.value <= F.max && !(F.hideSkip && t.verdict === 'skip'));
      const sorters = { match: (a, b) => b.match - a.match, deadline: (a, b) => a.deadline - b.deadline, value: (a, b) => b.value - a.value, fresh: (a, b) => a.published - b.published };
      list.sort(sorters[F.sort]);
      if (!list.length) { out.innerHTML = `<div class="empty"><b>Нічого не знайдено за цими фільтрами</b>Розширте бюджет або приберіть фільтр країни.<br><br><button class="btn btn--ghost" type="button" id="resetF">Скинути фільтри</button></div>`; $('#resetF', out).onclick = () => { F.q = ''; F.countries.clear(); F.verdict = 'all'; F.max = 8000000; F.hideSkip = false; render(); }; return; }
      out.innerHTML = S.view === 'table'
        ? `<div class="tscroll"><table class="table"><thead><tr><th>Збіг</th><th>Тендер</th><th>Країна</th><th>Джерело</th><th>Бюджет</th><th>Дедлайн</th></tr></thead><tbody>${list.map(t => `<tr><td><b class="num" style="color:${scoreColor(t.match)}">${t.match}</b></td><td><a href="#/tender/${t.id}">${esc(titleOf(t))}</a><br><small style="color:var(--text-3)">${esc(t.buyer)}</small></td><td>${t.country}</td><td>${esc(t.source)}</td><td class="num">${money(t)}</td><td><span class="dl ${dlCls(t.deadline)}">${fmtDate(dateIn(t.deadline))}</span></td></tr>`).join('')}</tbody></table></div>`
        : `<div class="tgrid">${list.map(tcard).join('')}</div>`;
      animateRings(out);
    }
    $('#fq', view).addEventListener('input', e => { F.q = e.target.value; apply(); });
    $$('[data-verdict]', view).forEach(b => b.onclick = () => { F.verdict = b.dataset.verdict; $$('[data-verdict]', view).forEach(x => x.setAttribute('aria-pressed', String(x === b))); apply(); });
    $$('[data-country]', view).forEach(b => b.onclick = () => { const c = b.dataset.country; F.countries.has(c) ? F.countries.delete(c) : F.countries.add(c); b.setAttribute('aria-pressed', String(F.countries.has(c))); apply(); });
    $('#fmax', view).addEventListener('input', e => { F.max = +e.target.value; $('#maxLbl', view).textContent = eurM(F.max); apply(); });
    $('#fsort', view).onchange = e => { F.sort = e.target.value; apply(); };
    $('#fskip', view).onchange = e => { F.hideSkip = e.target.checked; apply(); };
    $$('[data-view]', view).forEach(b => b.onclick = () => { S.view = b.dataset.view; save('view'); $$('[data-view]', view).forEach(x => x.setAttribute('aria-pressed', String(x === b))); apply(); });
    $('#saveSearch', view).onclick = () => toast('Пошук збережено. Нові збіги прийдуть у ранковий дайджест.');
    apply();
  };

  /* ===================== TENDER DETAIL ===================== */
  function tender(id, params) {
    const t = byId(id);
    if (!t) return `<div class="empty"><b>Тендер не знайдено</b>Можливо, його вже закрили. <a href="#/tenders">Повернутись до стрічки</a></div>`;
    const due = dateIn(t.deadline);
    const stage = S.pipeline[t.id];
    return `
    <section class="thero">${lp(photo(t))}
      <div class="thero__in">
        <div class="crumbs"><a href="#/tenders">Тендери</a> / ${t.id}</div>
        <h1>${esc(titleOf(t))}</h1>
        ${t.titleUa ? `<p class="thero__orig">Оригінал: ${esc(t.title)}</p>` : ''}
        <div class="thero__facts">
          <div><small>Очікувана вартість</small><b class="num">${money(t)}</b></div>
          <div><small>Дедлайн подачі</small><b>${fmtDate(due)}, 17:00</b></div>
          <div><small>Замовник</small><b>${esc(t.buyer)}</b></div>
          <div><small>Місце</small><b>${esc(t.cityName)}, ${esc(D.COUNTRIES[t.country])}</b></div>
          <div><small>CPV</small><b class="num">${t.cpv}</b></div>
        </div>
      </div></section>
    <div class="dgrid">
      <section class="card">
        <div class="tabs" role="tablist">
          ${[['brief', 'AI-бриф'], ['req', 'Вимоги'], ['risks', 'Ризики'], ['market', 'Аналітика'], ['docs', 'Документи'], ['chat', 'Запитати AI']].map(([k, n]) => `<button type="button" role="tab" data-tab="${k}" aria-selected="${(params.tab || 'brief') === k}">${n}${k === 'req' ? ` <span class="chip" style="margin-left:4px">${t.requirements.length}</span>` : ''}</button>`).join('')}
        </div>
        <div id="tabBody"></div>
      </section>
      <aside class="verdict">
        <section class="card">
          <div class="verdict__score">${ring(t.match, 120)}<div><div class="verdict__label">Вердикт AI</div><p class="verdict__title ${t.verdict}">${VERDICT[t.verdict]}</p><small style="color:var(--text-3)">збіг з профілем компанії</small></div></div>
          <div class="verdict__btns" style="margin-top:16px">
            ${stage ? `<a class="btn btn--primary" href="#/bid/${t.id}">Готувати заявку</a><a class="btn btn--ghost" href="#/pipeline">У pipeline</a>`
              : `<button class="btn btn--primary" type="button" id="goBid">Подаюсь</button><button class="btn btn--ghost" type="button" id="noBid">Не цікаво</button>`}
          </div>
          <div id="noWhy" hidden style="margin-top:10px"><p style="margin:0 0 8px;font-size:13px;color:var(--text-3)">Чому? Це покращить відбір.</p><div class="tags">${['Не наш профіль', 'Замалий бюджет', 'Не встигаємо', 'Не та країна'].map(r => `<button type="button" class="fchip" data-why="${r}">${r}</button>`).join('')}</div></div>
        </section>
        <section class="card"><h2 style="margin-bottom:12px">До дедлайну</h2><div class="countdown" id="cd" data-due="${due.toISOString()}"></div></section>
        <section class="card"><dl class="facts">
          <div><dt>Джерело</dt><dd>${esc(t.source)}</dd></div>
          <div><dt>Опубліковано</dt><dd>${t.published < 24 ? `${t.published} год тому` : `${Math.round(t.published / 24)} дн. тому`}</dd></div>
          <div><dt>Учасників у схожих</dt><dd class="num">~${t.bidders}</dd></div>
          <div><dt>Середня знижка</dt><dd class="num">${t.discount.toLocaleString('uk-UA')}%</dd></div>
          <div><dt>Документація</dt><dd class="num">${t.docs.reduce((a, d) => a + d.pages, 0)} стор.</dd></div>
        </dl>
        <button class="btn btn--ghost btn--sm" type="button" id="saveT" style="margin-top:14px;width:100%">${S.saved[t.id] ? 'Збережено' : 'Зберегти в обране'}</button></section>
      </aside>
    </div>`;
  }
  tender.title = id => titleOf(byId(id) || { title: 'Тендер' });
  tender.mount = (view, id, params) => {
    const t = byId(id); if (!t) return;
    const body = $('#tabBody', view);
    const tabs = {
      brief: () => `<div class="ai-mark"><img src="../brand/mark.svg" alt="">AI-бриф · прочитано ${t.docs.reduce((a, d) => a + d.pages, 0)} сторінок за 27 с</div>
        <p class="brief">${esc(t.brief)}</p>
        <div class="reasons"><div><h3>Чому підходить</h3><ul>${(t.reasons.length ? t.reasons : ['Мало збігів з профілем']).map(r => `<li>${esc(r)}</li>`).join('')}</ul></div>
        <div class="con"><h3>Що заважає</h3><ul>${(t.against.length ? t.against : ['Суттєвих перешкод не знайдено']).map(r => `<li>${esc(r)}</li>`).join('')}</ul></div></div>
        ${t.risks.some(r => r.level === 'high') ? `<p style="margin:18px 0 0;padding:12px 14px;border-radius:12px;background:var(--bad-bg);color:var(--bad);font-size:14px">Червоний прапорець: ${esc(t.risks.find(r => r.level === 'high').text)}</p>` : ''}`,
      req: () => { const ok = t.requirements.filter(r => r.status === 'ok').length;
        return `<p style="margin:0 0 14px;color:var(--text-2)">Ви відповідаєте <b style="color:var(--text)">${ok} з ${t.requirements.length}</b> вимог. Документи з бібліотеки підтягнуто автоматично.</p>
        <ul class="req">${t.requirements.map((r, i) => `<li><span class="st st--${r.status}">${ICON[r.status]}</span><div>${esc(r.text)}<small>${r.status === 'ok' ? (r.doc ? 'Є в бібліотеці: ' + esc((D.LIBRARY.find(l => l.id === r.doc) || {}).name || '') : 'Виконується') : r.status === 'missing' ? 'Бракує — додайте до чекліста' : 'Потребує ручної перевірки'}</small></div><button class="cite" type="button" data-cite="${i}">с. ${r.page}, п. ${r.clause}</button></li>`).join('') || '<li>Вимоги ще обробляються.</li>'}</ul>`; },
      risks: () => t.risks.map(r => `<div class="risk"><span class="chip ${r.level === 'high' ? 'chip--bad' : r.level === 'mid' ? 'chip--warn' : ''}">${r.level === 'high' ? 'Високий' : r.level === 'mid' ? 'Середній' : 'Низький'}</span><span>${esc(r.text)}</span>${r.page ? `<span class="cite">с. ${r.page}</span>` : '<span class="cite">аналітика</span>'}</div>`).join(''),
      market: () => { const win = t.value * (1 - t.discount / 100);
        return `<div class="grid" style="grid-template-columns:repeat(3,minmax(0,1fr));margin-bottom:18px">
          <div class="card kpi" style="background:var(--surface-2)"><small>Учасників зазвичай</small><b class="num">${t.bidders}</b></div>
          <div class="card kpi" style="background:var(--surface-2)"><small>Середня знижка</small><b class="num">${t.discount.toLocaleString('uk-UA')}%</b></div>
          <div class="card kpi" style="background:var(--surface-2)"><small>Прогноз ціни перемоги</small><b class="num">${t.country === 'UA' ? uah(win) : eur(win)}</b></div></div>
          <h3 style="font-size:15px;margin:0 0 10px">Попередні переможці у цього замовника</h3>
          ${t.winners.length ? `<div class="tscroll"><table class="table"><thead><tr><th>Компанія</th><th>Сума</th><th>Рік</th></tr></thead><tbody>${t.winners.map(w => `<tr><td>${esc(w.name)}</td><td class="num">${t.country === 'UA' ? uah(w.amount) : eur(w.amount)}</td><td>${w.year}</td></tr>`).join('')}</tbody></table></div>` : '<p style="color:var(--text-3)">Історії закупівель у цього замовника ще немає.</p>'}
          <p style="margin:14px 0 0;font-size:12px;color:var(--text-3)">Прогноз на основі схожих закупівель за CPV ${t.cpv} і регіоном. Демо-дані.</p>`; },
      docs: () => `<div class="docv"><div class="docv__list">${t.docs.map((d, i) => `<button type="button" data-doc="${i}" aria-pressed="${i === 0}">${esc(d.name)}<small>${d.pages} стор.</small></button>`).join('')}</div>
        <article class="page" id="page"><div class="page__h"><span>${esc(t.docs[0]?.name || '')}</span><span class="num" id="pageNo">с. ${t.requirements[0]?.page || 1}</span></div>
        <p style="font:600 15px var(--sans);color:#0B1A26">Розділ ${Math.max(2, Math.floor((t.requirements[0]?.page || 14) / 5))}. Кваліфікаційні та технічні вимоги</p>
        ${t.requirements.map((r, i) => `<p><mark id="clause-${i}">${esc(r.clause)}. ${esc(r.text)}.</mark></p><p>Учасник підтверджує відповідність цій вимозі документами, зазначеними в додатку ${i + 1} до тендерної документації.</p>`).join('')}</article></div>`,
      chat: () => `<div class="chat"><div class="chat__log" id="log"><div class="msg msg--ai">Я прочитав усю документацію цього тендера. Питайте — відповім з посиланням на сторінку і пункт.</div></div>
        <div class="chat__q">${['Чи потрібна банківська гарантія?', 'Які строки виконання?', 'Чого нам бракує?', 'Хто вигравав раніше?', 'Чи є аванс?'].map(q => `<button type="button" class="fchip" data-q="${q}">${q}</button>`).join('')}</div>
        <form class="chat__form" id="chatForm"><label class="sr-only" for="chatIn">Питання</label><input id="chatIn" placeholder="Наприклад: які документи підписує директор?" autocomplete="off"><button class="btn btn--primary" type="submit">Запитати</button></form></div>`
    };
    function show(k) {
      $$('[data-tab]', view).forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === k)));
      body.innerHTML = tabs[k](); bindTab(k);
    }
    function bindTab(k) {
      $$('[data-cite]', body).forEach(b => b.onclick = () => { show('docs'); const m = $('#clause-' + b.dataset.cite, body); $('#pageNo', body).textContent = 'с. ' + t.requirements[b.dataset.cite].page; m.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' }); m.classList.remove('flash'); void m.offsetWidth; m.classList.add('flash'); });
      $$('[data-doc]', body).forEach(b => b.onclick = () => { $$('[data-doc]', body).forEach(x => x.setAttribute('aria-pressed', String(x === b))); $('.page__h span', body).textContent = t.docs[b.dataset.doc].name; });
      if (k === 'chat') {
        const log = $('#log', body);
        const ask = q => {
          if (!q.trim()) return;
          log.insertAdjacentHTML('beforeend', `<div class="msg msg--me">${esc(q)}</div><div class="msg msg--ai typing" id="typing"><span></span><span></span><span></span></div>`);
          log.scrollTop = log.scrollHeight;
          setTimeout(() => { $('#typing', log)?.remove(); const a = answer(t, q); const el = document.createElement('div'); el.className = 'msg msg--ai'; log.append(el); streamInto(el, a.text, () => { if (a.cite) el.insertAdjacentHTML('beforeend', ` <span class="cite">${esc(a.cite)}</span>`); log.scrollTop = log.scrollHeight; }); }, reduced ? 0 : 700);
        };
        $$('[data-q]', body).forEach(b => b.onclick = () => ask(b.dataset.q));
        $('#chatForm', body).onsubmit = e => { e.preventDefault(); const i = $('#chatIn', body); ask(i.value); i.value = ''; };
      }
    }
    $$('[data-tab]', view).forEach(b => b.onclick = () => show(b.dataset.tab));
    show(params.tab && tabs[params.tab] ? params.tab : 'brief');
    $('#goBid', view)?.addEventListener('click', () => { S.pipeline[t.id] = 'analysis'; save('pipeline'); toast(`Додано в pipeline. <a href="#/bid/${t.id}">Готувати заявку</a>`); render(); });
    $('#noBid', view)?.addEventListener('click', () => { $('#noWhy', view).hidden = false; });
    $$('[data-why]', view).forEach(b => b.onclick = () => { S.dismissed[t.id] = b.dataset.why; save('dismissed'); toast('Зрозуміли. Схожі тендери показуватимемо рідше.'); location.hash = '#/tenders'; });
    $('#saveT', view).onclick = e => { S.saved[t.id] = !S.saved[t.id]; save('saved'); e.target.textContent = S.saved[t.id] ? 'Збережено' : 'Зберегти в обране'; };
    const cd = $('#cd', view); const due = new Date(cd.dataset.due);
    const tick = () => { const ms = Math.max(0, due - new Date()); const d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60, s = Math.floor(ms / 1e3) % 60;
      cd.innerHTML = [[d, 'днів'], [h, 'год'], [m, 'хв'], [s, 'сек']].map(([v, l]) => `<div><b class="num">${String(v).padStart(2, '0')}</b><small>${l}</small></div>`).join(''); };
    tick(); const iv = setInterval(tick, 1000); onCleanup(() => clearInterval(iv));
  };
  function answer(t, q) {
    const s = q.toLowerCase(); const find = re => t.requirements.find(r => re.test(r.text.toLowerCase()));
    let r;
    if (/гарант|security|забезпеч/.test(s)) { r = find(/гарант|security/); return r ? { text: `Так. ${r.text}. Банки зазвичай оформлюють таку гарантію за 2–5 робочих днів, тож закладіть це в план.`, cite: `с. ${r.page}, п. ${r.clause}` } : { text: 'Вимоги щодо гарантії забезпечення пропозиції в документації не знайшов.' }; }
    if (/строк|термін|днів|коли/.test(s)) { r = find(/строк|днів|постав/); const risk = t.risks.find(x => /дн/.test(x.text)); return r ? { text: `${r.text}.${risk ? ' Зверніть увагу: ' + risk.text.toLowerCase() + '.' : ''}`, cite: `с. ${r.page}, п. ${r.clause}` } : { text: `Подача пропозицій до ${fmtDate(dateIn(t.deadline))}, 17:00. Окремого строку виконання в кваліфікаційних вимогах немає — він у проєкті договору.` }; }
    if (/бракує|відсутн|не вистач|чого нам/.test(s)) { const miss = t.requirements.filter(x => x.status !== 'ok'); return miss.length ? { text: 'Бракує або потребує перевірки: ' + miss.map(x => `${x.text.toLowerCase()} (с. ${x.page})`).join('; ') + '. Решта документів уже є у вашій бібліотеці.' } : { text: 'За документацією вам нічого не бракує — усі вимоги покриті документами з бібліотеки.' }; }
    if (/вигра|переможц|конкурен/.test(s)) { return t.winners.length ? { text: 'Раніше в цього замовника вигравали: ' + t.winners.map(w => `${w.name} (${w.year}, ${t.country === 'UA' ? uah(w.amount) : eur(w.amount)})`).join('; ') + `. У схожих закупівлях зазвичай ${t.bidders} учасники, середня знижка ${t.discount.toLocaleString('uk-UA')}%.` } : { text: `Історії перемог у цього замовника немає. У схожих закупівлях зазвичай ${t.bidders} учасники.` }; }
    if (/аванс|оплат|плат/.test(s)) { r = t.risks.find(x => /аванс|оплат/.test(x.text.toLowerCase())); return r ? { text: r.text + '.', cite: `с. ${r.page}` } : { text: 'Умови оплати описані в проєкті договору; окремих ризиків щодо оплати AI не виявив.' }; }
    if (/документ|довідк|підпис/.test(s)) { return { text: 'Потрібні документи: ' + t.requirements.map(x => x.text.toLowerCase()).slice(0, 4).join('; ') + '. Повний перелік — у вкладці «Вимоги».', cite: t.requirements[0] ? `с. ${t.requirements[0].page}` : '' }; }
    return { text: 'У документації цього тендера я не знайшов відповіді на це питання. Спробуйте переформулювати або поставте питання замовнику через майданчик — до дедлайну ще є час.' };
  }
  function streamInto(el, text, done) {
    if (reduced) { el.textContent = text; done && done(); return; }
    let i = 0; const go = () => { i = Math.min(text.length, i + 3); el.textContent = text.slice(0, i); if (i < text.length) setTimeout(go, 14); else done && done(); }; go();
  }

  /* ===================== PIPELINE ===================== */
  function pipeline() {
    return `<div class="ph"><div><h1>Pipeline</h1><p>Перетягуйте картки між етапами або використовуйте стрілки.</p></div><div class="ph__actions"><a class="btn btn--primary" href="#/tenders">Додати тендер</a></div></div>
    <div class="board" id="board">${D.STAGES.map((s, si) => { const items = D.TENDERS.filter(t => S.pipeline[t.id] === s.id);
      return `<section class="col" data-stage="${s.id}" aria-label="${s.name}"><div class="col__head"><b>${s.name}</b><span>${items.length}</span></div><div class="col__sum num">${items.length ? eurM(items.reduce((a, t) => a + t.value, 0)) : '—'}</div>
        ${items.map(t => `<article class="kcard" draggable="true" data-id="${t.id}"><a href="#/tender/${t.id}">${esc(titleOf(t))}</a>
          <div class="kcard__row"><span class="num">${money(t)}</span><span class="dl ${dlCls(t.deadline)}">${fmtDate(dateIn(t.deadline))}</span></div>
          <div class="kcard__row">${D.OWNERS[t.id] ? `<span class="avatar avatar--sm" title="Відповідальний">${D.OWNERS[t.id]}</span>` : '<span class="chip">Без відповідального</span>'}<span class="kcard__move">
            <button type="button" data-move="-1" aria-label="На етап назад" ${si === 0 ? 'disabled' : ''}>‹</button><button type="button" data-move="1" aria-label="На наступний етап" ${si === D.STAGES.length - 1 ? 'disabled' : ''}>›</button></span></div></article>`).join('') || '<p style="font-size:13px;color:var(--text-3);padding:4px">Перетягніть сюди</p>'}</section>`; }).join('')}</div>`;
  }
  pipeline.title = () => 'Pipeline';
  pipeline.mount = view => {
    const move = (id, stage) => { S.pipeline[id] = stage; save('pipeline'); const n = D.STAGES.find(s => s.id === stage).name; render(); toast(`Перенесено в «${n}»`); };
    $$('.kcard', view).forEach(c => {
      c.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', c.dataset.id); c.classList.add('is-dragging'); });
      c.addEventListener('dragend', () => c.classList.remove('is-dragging'));
      $$('[data-move]', c).forEach(b => b.onclick = () => { const i = D.STAGES.findIndex(s => s.id === S.pipeline[c.dataset.id]) + +b.dataset.move; if (D.STAGES[i]) move(c.dataset.id, D.STAGES[i].id); });
    });
    $$('.col', view).forEach(col => {
      col.addEventListener('dragover', e => { e.preventDefault(); col.classList.add('is-over'); });
      col.addEventListener('dragleave', () => col.classList.remove('is-over'));
      col.addEventListener('drop', e => { e.preventDefault(); col.classList.remove('is-over'); const id = e.dataTransfer.getData('text/plain'); if (id && S.pipeline[id] !== col.dataset.stage) move(id, col.dataset.stage); });
    });
  };

  /* ===================== BID WORKSPACE ===================== */
  function bidItems(t) {
    const base = t.requirements.map((r, i) => ({ k: 'r' + i, text: r.text, sub: `с. ${r.page}, п. ${r.clause}`, auto: r.status === 'ok' }));
    return base.concat([{ k: 'x1', text: 'Цінова пропозиція за формою додатка', sub: 'Підписує директор' }, { k: 'x2', text: 'Технічна пропозиція', sub: 'Чернетка в редакторі нижче' }, { k: 'x3', text: 'Перевірити КЕП директора', sub: 'Строк дії ключа' }]);
  }
  function bid(id) {
    const options = D.TENDERS.filter(t => S.pipeline[t.id]);
    const t = byId(id) || options[0];
    if (!t) return `<div class="empty"><b>Ще немає заявок у роботі</b>Позначте тендер як «Подаюсь», і тут з’явиться робоче місце заявки.<br><br><a class="btn btn--primary" href="#/tenders">Обрати тендер</a></div>`;
    const items = bidItems(t); const st = S.checks[t.id] || Object.fromEntries(items.filter(i => i.auto).map(i => [i.k, true]));
    S.checks[t.id] = st; const done = items.filter(i => st[i.k]).length; const pct = Math.round(done / items.length * 100);
    return `<div class="ph"><div><h1>Заявка</h1><p>${esc(titleOf(t))}</p></div>
      <div class="ph__actions"><label class="sr-only" for="bidSel">Тендер</label><select class="select" id="bidSel">${options.map(o => `<option value="${o.id}"${o.id === t.id ? ' selected' : ''}>${esc(titleOf(o).slice(0, 60))}</option>`).join('')}</select><a class="btn btn--ghost" href="#/tender/${t.id}">До тендера</a></div></div>
    <div class="bgrid">
      <div class="grid">
        <section class="card"><div class="card__head"><h2>Чекліст документів</h2><span class="num" style="color:var(--text-3)" id="ckCount">${done} з ${items.length}</span></div>
          <div class="progress" style="margin-bottom:14px"><span id="ckBar" style="width:${pct}%"></span></div>
          <ul class="check">${items.map(i => `<li class="${st[i.k] ? 'is-done' : ''}"><input type="checkbox" id="ck-${i.k}" data-k="${i.k}" ${st[i.k] ? 'checked' : ''}><label for="ck-${i.k}">${esc(i.text)}<small>${esc(i.sub)}${i.auto ? ' · знайдено в бібліотеці' : ''}</small></label><span class="chip ${st[i.k] ? 'chip--good' : ''}">${st[i.k] ? 'Готово' : 'Треба'}</span></li>`).join('')}</ul></section>
        <section class="card"><div class="card__head"><h2>Технічна пропозиція</h2><span style="font-size:13px;color:var(--text-3)" id="saved">Зберігається автоматично</span></div>
          <div class="toolbar"><button class="btn btn--primary btn--sm" type="button" id="gen">${ICON.spark}Згенерувати чернетку</button><button class="btn btn--ghost btn--sm" type="button" id="genLetter">Супровідний лист</button><button class="btn btn--ghost btn--sm" type="button" id="copy">${ICON.copy}Копіювати</button><button class="btn btn--ghost btn--sm" type="button" id="dl">${ICON.down}Завантажити .md</button></div>
          <div class="editor" id="ed" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Текст пропозиції" data-placeholder="Натисніть «Згенерувати чернетку» — AI напише технічну пропозицію на основі вимог тендера і вашої бібліотеки.">${esc(S.drafts[t.id] || '')}</div></section>
      </div>
      <aside class="grid">
        <section class="card" style="text-align:center"><h2 style="margin-bottom:14px">Готовність заявки</h2><div style="display:grid;place-items:center">${ring(pct, 120)}</div>
          <p style="margin:14px 0 0;color:var(--text-2);font-size:14px" id="ckMsg">${pct === 100 ? 'Усе готово до подачі. Перевірте КЕП і подавайте на майданчику.' : `Бракує ${items.length - done} ${plural(items.length - done, 'пункту', 'пунктів', 'пунктів')}. Почніть з тих, що потребують часу (гарантія, довідки).`}</p></section>
        <section class="card"><h2 style="margin-bottom:12px">Документи з бібліотеки</h2><div class="tlist">${t.requirements.filter(r => r.doc).map(r => { const l = D.LIBRARY.find(x => x.id === r.doc); return l ? `<div class="trow" style="grid-template-columns:auto 1fr;padding:10px 12px"><span class="libc__ic">PDF</span><div><div style="font-size:14px">${esc(l.name)}</div><small style="color:${l.valid != null && l.valid < 15 ? 'var(--bad)' : 'var(--text-3)'}">${l.valid == null ? 'Безстроковий' : `Дійсний ще ${l.valid} дн.`}</small></div></div>` : ''; }).join('') || '<p style="color:var(--text-3);font-size:14px">Немає документів, що підходять.</p>'}</div></section>
        <section class="card"><h2 style="margin-bottom:12px">Команда</h2>${D.TEAM.map(m => `<div style="display:flex;gap:10px;align-items:center;padding:6px 0"><span class="avatar avatar--sm">${m.initials}</span><div style="font-size:14px">${esc(m.name)}<small style="display:block;color:var(--text-3)">${esc(m.role)}</small></div></div>`).join('')}</section>
      </aside>
    </div>`;
  }
  bid.title = () => 'Заявка';
  bid.mount = (view, id) => {
    const t = byId(id) || D.TENDERS.find(x => S.pipeline[x.id]); if (!t) return;
    const items = bidItems(t);
    $('#bidSel', view).onchange = e => { location.hash = '#/bid/' + e.target.value; };
    $$('.check input', view).forEach(cb => cb.onchange = () => {
      S.checks[t.id][cb.dataset.k] = cb.checked; save('checks');
      const done = items.filter(i => S.checks[t.id][i.k]).length, pct = Math.round(done / items.length * 100);
      const li = cb.closest('li'); li.classList.toggle('is-done', cb.checked); const chip = $('.chip', li); chip.className = 'chip ' + (cb.checked ? 'chip--good' : ''); chip.textContent = cb.checked ? 'Готово' : 'Треба';
      $('#ckCount', view).textContent = `${done} з ${items.length}`; $('#ckBar', view).style.width = pct + '%';
      const r = $('.ring .fg', view); const c = 2 * Math.PI * 52; r.style.strokeDashoffset = (c * (1 - pct / 100)).toFixed(2); r.setAttribute('stroke', scoreColor(pct)); $('.ring b', view).textContent = pct;
      $('#ckMsg', view).textContent = pct === 100 ? 'Усе готово до подачі. Перевірте КЕП і подавайте на майданчику.' : `Бракує ${items.length - done} ${plural(items.length - done, 'пункту', 'пунктів', 'пунктів')}.`;
      if (pct === 100) toast('Заявка готова на 100%. Залишилось подати її на майданчику з КЕП.');
    });
    const ed = $('#ed', view); let tm = 0;
    ed.addEventListener('input', () => { clearTimeout(tm); $('#saved', view).textContent = 'Зберігаємо…'; tm = setTimeout(() => { S.drafts[t.id] = ed.innerText; save('drafts'); $('#saved', view).textContent = 'Збережено'; }, 500); });
    const proposal = () => `Технічна пропозиція\n\nЗамовнику: ${t.buyer}\nПредмет закупівлі: ${titleOf(t)} (CPV ${t.cpv})\n\n1. Розуміння завдання\n${t.brief}\n\n2. Відповідність кваліфікаційним вимогам\n${t.requirements.map((r, i) => `${i + 1}) ${r.text} — ${r.status === 'ok' ? 'підтверджується документами з додатків' : 'буде надано до подачі пропозиції'} (п. ${r.clause}).`).join('\n')}\n\n3. Методологія і план робіт\nРоботи виконуються поетапно без зупинки діяльності замовника: мобілізація і погодження графіка (тиждень 1), основні роботи за пусковими комплексами, приймання-передача і навчання персоналу замовника. Керівник проєкту — відповідальна особа для щоденної комунікації.\n\n4. Управління ризиками\n${t.risks.map(r => `— ${r.text}: передбачено резерв ресурсів і щотижневий контроль графіка.`).join('\n')}\n\n5. Досвід компанії\n${D.COMPANY.name} виконала аналогічні договори за останні 3 роки; довідка і копії договорів додаються.\n`;
    const letter = () => `Супровідний лист\n\nДо: ${t.buyer}\nВід: ${D.COMPANY.name}, код ${D.COMPANY.code}\n\nНаправляємо тендерну пропозицію на закупівлю «${titleOf(t)}». Підтверджуємо згоду з умовами тендерної документації і проєкту договору та готовність виконати договір у визначені строки.\n\nКонтактна особа: ${D.USER.name}, ${D.USER.role.toLowerCase()}.\n\nЗ повагою,\n${D.USER.name}`;
    const gen = fn => { ed.textContent = ''; streamInto(ed, fn(), () => { S.drafts[t.id] = ed.innerText; save('drafts'); $('#saved', view).textContent = 'Збережено'; toast('Чернетку згенеровано. Перевірте і відредагуйте під себе.'); }); };
    $('#gen', view).onclick = () => gen(proposal);
    $('#genLetter', view).onclick = () => gen(letter);
    $('#copy', view).onclick = async () => { try { await navigator.clipboard.writeText(ed.innerText); toast('Текст скопійовано'); } catch { toast('Не вдалося скопіювати — виділіть текст вручну'); } };
    $('#dl', view).onclick = () => { const blob = new Blob([ed.innerText || ''], { type: 'text/markdown;charset=utf-8' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${t.id}-proposal.md`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); };
  };

  /* ===================== LIBRARY ===================== */
  const LF = { type: 'Усі' };
  function library() {
    const all = D.LIBRARY.concat(S.uploads);
    const types = ['Усі', ...new Set(all.map(l => l.type))];
    const expiring = all.filter(l => l.valid != null && l.valid <= 14);
    return `<div class="ph"><div><h1>Бібліотека</h1><p>Документи, які AI підставляє в заявки автоматично.</p></div></div>
    ${expiring.length ? `<div class="card" style="margin-bottom:16px;border-color:var(--warn);background:var(--warn-bg)"><b style="font-weight:500">Спливає строк дії: ${expiring.map(l => esc(l.name)).join(', ')}</b><p style="margin:4px 0 0;color:var(--text-2);font-size:14px">Оновіть документи заздалегідь — вони потрібні в ${D.TENDERS.filter(t => t.requirements.some(r => expiring.some(e => e.id === r.doc))).length} тендерах з вашого pipeline.</p></div>` : ''}
    <div class="filters"><div class="seg" role="group" aria-label="Тип">${types.map(t => `<button type="button" data-type="${esc(t)}" aria-pressed="${LF.type === t}">${esc(t)}</button>`).join('')}</div></div>
    <div class="lib">
      <label class="drop" id="drop"><input type="file" id="file" multiple hidden><b style="display:block;color:var(--text);font-weight:500">Додати документи</b>Перетягніть файли сюди або натисніть. PDF, DOCX, JPG.</label>
      ${all.filter(l => LF.type === 'Усі' || l.type === LF.type).map(l => `<article class="libc"><div style="display:flex;gap:12px;align-items:flex-start"><span class="libc__ic">${l.ext || 'PDF'}</span><div><b>${esc(l.name)}</b><div style="font-size:12px;color:var(--text-3);margin-top:4px">${esc(l.type)} · ${esc(l.size)}</div></div></div>
        <div style="display:flex;justify-content:space-between;align-items:center">${l.valid == null ? '<span class="chip">Безстроковий</span>' : `<span class="chip ${l.valid <= 7 ? 'chip--bad' : l.valid <= 14 ? 'chip--warn' : 'chip--good'}">Дійсний ще ${l.valid} дн.</span>`}<span style="font-size:12px;color:var(--text-3)">у ${D.TENDERS.filter(t => t.requirements.some(r => r.doc === l.id)).length} тендерах</span></div></article>`).join('')}
    </div>`;
  }
  library.title = () => 'Бібліотека';
  library.mount = view => {
    $$('[data-type]', view).forEach(b => b.onclick = () => { LF.type = b.dataset.type; render(); });
    const drop = $('#drop', view), file = $('#file', view);
    const add = files => { [...files].forEach(f => S.uploads.push({ id: 'up-' + Date.now() + Math.random().toString(36).slice(2, 6), type: 'Завантажене', name: f.name, valid: null, size: f.size > 1e6 ? (f.size / 1e6).toFixed(1).replace('.', ',') + ' МБ' : Math.max(1, Math.round(f.size / 1e3)) + ' КБ', ext: (f.name.split('.').pop() || 'FILE').slice(0, 4).toUpperCase() })); save('uploads'); render(); toast(`Додано ${files.length} ${plural(files.length, 'файл', 'файли', 'файлів')}. У демо файли зберігаються лише як назви у вашому браузері.`); };
    file.onchange = () => file.files.length && add(file.files);
    drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('is-over'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('is-over'));
    drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('is-over'); if (e.dataTransfer.files.length) add(e.dataTransfer.files); });
  };

  /* ===================== ANALYTICS ===================== */
  function analytics() {
    const A = D.ANALYTICS; const W = 620, H = 240, pad = 34, bw = 30, gap = (W - pad * 2) / A.months.length;
    const max = Math.max(...A.submitted) + 1;
    const y = v => H - 28 - v / max * (H - 56);
    const bars = A.months.map((m, i) => { const x = pad + i * gap + gap / 2; return `<rect x="${x - bw / 2 - 2}" y="${y(A.submitted[i])}" width="${bw / 2}" height="${H - 28 - y(A.submitted[i])}" rx="4" fill="var(--verd)" fill-opacity=".45"/><rect x="${x + 2}" y="${y(A.won[i])}" width="${bw / 2}" height="${H - 28 - y(A.won[i])}" rx="4" fill="var(--brass)"/><text x="${x}" y="${H - 8}" text-anchor="middle">${m}</text>`; }).join('');
    const grid = [0, 2, 4, 6].map(v => `<line x1="${pad}" x2="${W - 10}" y1="${y(v)}" y2="${y(v)}"/><text x="${pad - 8}" y="${y(v) + 4}" text-anchor="end">${v}</text>`).join('');
    const dmax = Math.max(...A.byCpv.map(d => d[1]));
    const sub = A.submitted.reduce((a, b) => a + b, 0), won = A.won.reduce((a, b) => a + b, 0);
    return `<div class="ph"><div><h1>Аналітика</h1><p>Ваші результати і ринок за останні 6 місяців. Демо-дані.</p></div></div>
    <div class="grid g-kpi">
      <div class="card kpi kpi--hero"><small>Виграно контрактів</small><b class="num">€2,9 млн</b><span>${won} перемог</span></div>
      <div class="card kpi"><small>Подано заявок</small><b class="num">${sub}</b><span>+40% до попередніх 6 міс.</span></div>
      <div class="card kpi"><small>Win rate</small><b class="num">${Math.round(won / sub * 100)}%</b><span>ринок: ~18%</span></div>
      <div class="card kpi"><small>Годин заощаджено</small><b class="num">~310</b><span>за оцінкою на 1 заявку</span></div>
    </div>
    <div class="grid g-main" style="margin-top:16px">
      <section class="card"><div class="card__head"><h2>Подано і виграно по місяцях</h2></div>
        <svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Подано і виграно заявок по місяцях"><g class="grid">${grid}</g>${bars}</svg>
        <div class="legend"><span><i style="background:var(--verd);opacity:.6"></i>Подано</span><span><i style="background:var(--brass)"></i>Виграно</span></div></section>
      <section class="card"><div class="card__head"><h2>Середня знижка переможця за CPV</h2></div>
        <svg class="chart" viewBox="0 0 420 ${A.byCpv.length * 36}" role="img" aria-label="Середня знижка переможця за напрямами">${A.byCpv.map((d, i) => `<g transform="translate(0 ${i * 36})"><text x="0" y="22">${d[0]}</text><rect x="120" y="9" width="${(240 * d[1] / dmax).toFixed(1)}" height="18" rx="5" fill="var(--verd-hi)" fill-opacity="${.35 + .65 * d[1] / dmax}"/><text x="${128 + 240 * d[1] / dmax}" y="22" style="fill:var(--text)">${d[1].toLocaleString('uk-UA')}%</text></g>`).join('')}</svg>
        <p style="margin:8px 0 0;font-size:13px;color:var(--text-3)">Підказка для ціноутворення: на скільки нижче очікуваної вартості зазвичай перемагають.</p></section>
    </div>
    <section class="card" style="margin-top:16px"><div class="card__head"><h2>Ваші замовники</h2></div>
      <div class="tscroll" style="border:0"><table class="table"><thead><tr><th>Замовник</th><th>Подано</th><th>Виграно</th><th>Win rate</th></tr></thead><tbody>${A.buyers.map(b => `<tr><td>${esc(b[0])}</td><td class="num">${b[1]}</td><td class="num">${b[2]}</td><td><div class="progress" style="width:120px;display:inline-block;vertical-align:middle;margin-right:8px"><span style="width:${b[2] / b[1] * 100}%"></span></div><span class="num">${Math.round(b[2] / b[1] * 100)}%</span></td></tr>`).join('')}</tbody></table></div></section>`;
  }
  analytics.title = () => 'Аналітика';

  /* ===================== SETTINGS ===================== */
  function settings(_, params) {
    const tab = params.tab || 'company';
    const tabs = [['company', 'Компанія'], ['team', 'Команда'], ['plan', 'Тариф'], ['integrations', 'Інтеграції'], ['look', 'Вигляд']];
    const C = D.COMPANY;
    const bodies = {
      company: `<form class="form" id="coForm"><div class="field"><label for="coName">Назва</label><input id="coName" value="${esc(C.name)}"></div>
        <div class="field"><label for="coCode">Реєстраційний код</label><input id="coCode" value="${esc(C.code)}"></div>
        <div class="field"><label for="coSite">Сайт</label><input id="coSite" value="${esc(C.website || '')}" placeholder="https://"></div>
        <div class="field"><label>Коди CPV</label><div class="tags">${C.cpv.map(c => `<span class="chip chip--good">${esc(c)}</span>`).join('')}<button type="button" class="fchip" id="addCpv">+ Додати</button></div></div>
        <div class="field"><label>Регіони</label><div class="tags">${C.regions.map(r => `<span class="chip">${esc(r)}</span>`).join('')}</div></div>
        <div class="field"><label for="coMin">Бюджет тендерів, € від — до</label><div style="display:flex;gap:8px"><input id="coMin" value="${nf.format(C.budget[0])}"><input aria-label="до" value="${nf.format(C.budget[1])}"></div></div>
        <div class="field"><label for="coEx">Виключити слова</label><textarea id="coEx" placeholder="Наприклад: харчування, паливо"></textarea></div>
        <div><button class="btn btn--primary" type="submit">Зберегти профіль</button></div></form>`,
      team: `<div class="form"><div class="card" style="padding:8px 16px">${D.TEAM.concat((ACC ? ACC.invites : S.invites).map(e => ({ name: e, role: ACC ? 'Очікує реєстрації' : 'Запрошення надіслано', initials: e[0].toUpperCase() }))).map(m => `<div style="display:flex;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid var(--line)"><span class="avatar avatar--sm">${esc(m.initials)}</span><div style="flex:1">${esc(m.name)}<small style="display:block;color:var(--text-3)">${esc(m.role)}</small></div></div>`).join('')}</div>
        <form id="invForm" style="display:flex;gap:8px"><label class="sr-only" for="invEmail">Email</label><input class="select" style="flex:1;height:42px;border-radius:10px" id="invEmail" type="email" required placeholder="email колеги"><button class="btn btn--primary" type="submit">Запросити</button></form><p style="margin:0;font-size:13px;color:var(--text-3)">${ACC ? 'Попросіть колегу зареєструватися з цим email — він автоматично приєднається до вашої компанії.' : 'Тариф Pro: до 5 користувачів. У демо запрошення не надсилаються.'}</p></div>`,
      plan: `<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr))">${[['Start', 49, 'Для малих компаній'], ['Pro', 149, 'Ваш тариф · тріал 12 днів'], ['Business', 399, 'Для bid-команд']].map(([n, p, d]) => `<div class="card" style="${n === 'Pro' ? 'border-color:var(--accent)' : ''}"><h3 style="font-size:18px">${n}</h3><p style="margin:4px 0 14px;color:var(--text-3);font-size:13px">${d}</p><b class="num" style="font-size:32px;font-weight:500;letter-spacing:-.03em">€${p}</b><span style="color:var(--text-3)"> / міс</span><div style="margin-top:14px">${n === 'Pro' ? '<span class="chip chip--good">Поточний</span>' : `<button class="btn btn--ghost btn--sm" type="button" data-plan="${n}">Обрати</button>`}</div></div>`).join('')}</div>
        <p style="color:var(--text-3);font-size:13px">Оплата карткою або SEPA, рахунок для юросіб. Для України — у гривнях.</p>`,
      integrations: `<div class="integr">${[['TG', 'Telegram', 'Ранковий дайджест і нагадування про дедлайни', 'tg'], ['@', 'Email', 'Дайджест на пошту о 8:00', 'mail'], ['HS', 'HubSpot', 'Угоди з pipeline у CRM', 'hs'], ['GD', 'Google Drive', 'Імпорт документів у бібліотеку', 'gd'], ['31', 'Календар', 'Дедлайни у Google / Outlook', 'cal'], ['{}', 'API', 'Доступ для власних систем (Business)', 'api']].map(([ic, n, d, k]) => `<div class="card"><span class="ic">${ic}</span><b style="font-weight:500">${n}</b><p style="margin:0;color:var(--text-2);font-size:14px">${d}</p><button class="btn btn--ghost btn--sm" type="button" data-int="${k}" style="justify-self:start">${k === 'mail' ? 'Підключено' : 'Підключити'}</button></div>`).join('')}</div>`,
      look: `<div class="form"><div class="field"><label>Тема</label><div class="seg" role="group" aria-label="Тема"><button type="button" data-theme-set="dark" aria-pressed="${S.theme === 'dark'}">Темна</button><button type="button" data-theme-set="light" aria-pressed="${S.theme === 'light'}">Світла</button></div></div>
        ${ACC ? `<div class="field"><label>Акаунт</label><div style="color:var(--text-2);font-size:14px">${esc(ACC.email)} · ${ROLE_UA[ACC.role] || ''}</div><div><button class="btn btn--danger" type="button" id="signOut2">Вийти з акаунта</button></div></div>` : `<div class="field"><label>Демо</label><div><button class="btn btn--ghost" type="button" id="resetDemo">Скинути демо-дані</button> <button class="btn btn--ghost" type="button" id="runOnb">Пройти онбординг знову</button></div></div>`}</div>`
    };
    return `<div class="ph"><div><h1>Налаштування</h1></div></div>
      <div class="tabs" role="tablist">${tabs.map(([k, n]) => `<button type="button" role="tab" data-stab="${k}" aria-selected="${k === tab}">${n}</button>`).join('')}</div>
      ${bodies[tab] || bodies.company}`;
  }
  settings.title = () => 'Налаштування';
  settings.mount = view => {
    $$('[data-stab]', view).forEach(b => b.onclick = () => { location.hash = '#/settings?tab=' + b.dataset.stab; });
    $('#coForm', view)?.addEventListener('submit', async e => {
      e.preventDefault();
      const name = $('#coName', view).value.trim(), code = $('#coCode', view).value.trim(), website = $('#coSite', view).value.trim();
      if (name.length < 2) { toast('Вкажіть назву компанії'); return; }
      if (ACC) {
        if (ACC.role === 'member') { toast('Змінювати профіль компанії можуть власник або адміністратор.'); return; }
        const { error } = await ACC.client.from('organizations').update({ name, reg_code: code || null, website: website || null }).eq('id', ACC.org.id);
        if (error) { toast('Не вдалося зберегти. Спробуйте ще раз.'); return; }
        Object.assign(ACC.org, { name, reg_code: code, website });
      }
      Object.assign(D.COMPANY, { name, code, website }); paintAccount();
      toast('Профіль збережено. Відбір тендерів оновиться за кілька хвилин.');
    });
    $('#addCpv', view)?.addEventListener('click', () => toast('Почніть вводити назву робіт — AI підбере коди CPV. (У демо недоступно)'));
    $('#invForm', view)?.addEventListener('submit', async e => {
      e.preventDefault(); const email = $('#invEmail', view).value.trim().toLowerCase();
      if (ACC) {
        if (ACC.role === 'member') { toast('Запрошувати можуть власник або адміністратор.'); return; }
        const { error } = await ACC.client.from('invitations').insert({ org_id: ACC.org.id, email, invited_by: ACC.uid });
        if (error) { toast(/duplicate|unique/i.test(error.message) ? 'Цю людину вже запрошено.' : 'Не вдалося додати запрошення.'); return; }
        ACC.invites.push(email);
      } else { S.invites.push(email); save('invites'); }
      render(); toast('Запрошення додано');
    });
    $('#signOut2', view)?.addEventListener('click', signOut);
    $$('[data-plan]', view).forEach(b => b.onclick = () => toast(`Тариф ${b.dataset.plan}: у демо оплата не підключена.`));
    $$('[data-int]', view).forEach(b => b.onclick = () => { if (b.dataset.int === 'tg') { b.textContent = 'Очікує підтвердження'; toast('У робочій версії тут з’явиться QR-код для Telegram-бота Tendera.'); } else toast('Інтеграція буде доступна в робочій версії.'); });
    $$('[data-theme-set]', view).forEach(b => b.onclick = () => { setTheme(b.dataset.themeSet); render(); });
    $('#resetDemo', view)?.addEventListener('click', () => { ['pipeline', 'dismissed', 'saved', 'checks', 'drafts', 'uploads', 'invites'].forEach(k => { try { localStorage.removeItem('tendera.' + k); } catch { /* ignore */ } }); location.reload(); });
    $('#runOnb', view)?.addEventListener('click', () => openOnboarding(''));
  };

  /* ---------- theme, menu, notifications ---------- */
  function setTheme(t) { S.theme = t; save('theme'); document.documentElement.dataset.theme = t; $('meta[name="theme-color"]').content = t === 'dark' ? '#0B1A26' : '#EEF1EC'; }
  $('#themeBtn').onclick = () => { setTheme(S.theme === 'dark' ? 'light' : 'dark'); render(); };
  $('#menuBtn').onclick = () => { const o = !$('#side').classList.contains('is-open'); $('#side').classList.toggle('is-open', o); $('#menuBtn').setAttribute('aria-expanded', String(o)); };
  const bell = $('#bellBtn'), pop = $('#bellPop');
  bell.onclick = e => { e.stopPropagation(); pop.hidden = !pop.hidden; bell.setAttribute('aria-expanded', String(!pop.hidden)); $('.dot', bell)?.remove(); };
  document.addEventListener('click', e => { if (!pop.hidden && !pop.contains(e.target)) { pop.hidden = true; bell.setAttribute('aria-expanded', 'false'); } });
  $('#orgBtn').onclick = () => { location.hash = '#/settings?tab=company'; };
  const me = $('#meBtn'), mePop = $('#mePop');
  me.onclick = e => { e.stopPropagation(); mePop.hidden = !mePop.hidden; me.setAttribute('aria-expanded', String(!mePop.hidden)); };
  document.addEventListener('click', e => { if (!mePop.hidden && !mePop.contains(e.target)) { mePop.hidden = true; me.setAttribute('aria-expanded', 'false'); } });
  $('#signOut').onclick = signOut;
  async function signOut() {
    if (ACC) { await ACC.client.auth.signOut(); location.replace(window.tenderaAuth.siteRoot() + 'auth/?mode=login'); }
    else location.href = '../auth/?mode=signup';
  }
  function paintAccount() {
    const C = D.COMPANY;
    $('#orgName').textContent = C.name;
    $('#orgLogo').textContent = initials(C.name.replace(/^(ТОВ|ПП|ФОП|ПрАТ|АТ|Sp\. z o\.o\.|GmbH)\s*/i, '').replace(/[«»"']/g, ''));
    $('#meName').textContent = D.USER.name; $('#meMail').textContent = ACC ? ACC.email : 'Демо-користувач';
    me.textContent = D.USER.initials; me.title = D.USER.name;
    if (ACC) {
      const days = Math.max(0, Math.ceil((new Date(ACC.org.trial_ends_at) - new Date()) / 864e5));
      $('#orgPlan').textContent = ACC.org.plan === 'trial' ? `Тріал Pro · ${days} ${plural(days, 'день', 'дні', 'днів')}` : `Тариф ${ACC.org.plan[0].toUpperCase() + ACC.org.plan.slice(1)}`;
      const pill = $('.demo-pill'); pill.textContent = 'Демо-тендери'; pill.title = 'Стрічка тендерів поки працює на демонстраційних даних';
      $('#signOut b').textContent = 'Вийти';
    } else { $('#signOut b').textContent = 'Зареєструвати компанію'; $('#signOut b').style.color = 'var(--accent)'; }
  }
  $('#newCount').textContent = D.TENDERS.filter(t => t.published <= 12).length;

  /* ---------- command palette ---------- */
  const pal = $('#palette'), pin = $('#paletteInput'), plist = $('#paletteList');
  const CMDS = [
    { label: 'Огляд', hint: 'Розділ', go: '#/' }, { label: 'Тендери', hint: 'Розділ', go: '#/tenders' }, { label: 'Pipeline', hint: 'Розділ', go: '#/pipeline' },
    { label: 'Бібліотека документів', hint: 'Розділ', go: '#/library' }, { label: 'Аналітика', hint: 'Розділ', go: '#/analytics' }, { label: 'Налаштування профілю', hint: 'Розділ', go: '#/settings' },
    { label: 'Перемкнути тему', hint: 'Дія', run: () => { setTheme(S.theme === 'dark' ? 'light' : 'dark'); render(); } },
    ...D.TENDERS.map(t => ({ label: titleOf(t), hint: `${t.country} · ${t.match}`, go: '#/tender/' + t.id, extra: t.buyer + ' ' + t.title }))
  ];
  let sel = 0, shown = [];
  function openPal() { pal.hidden = false; pin.value = ''; drawPal(); pin.focus(); }
  function closePal() { pal.hidden = true; }
  function drawPal() {
    const q = pin.value.trim().toLowerCase();
    shown = CMDS.filter(c => !q || (c.label + ' ' + (c.extra || '')).toLowerCase().includes(q)).slice(0, 9); sel = 0;
    plist.innerHTML = shown.map((c, i) => `<li role="option" id="po-${i}" aria-selected="${i === sel}" data-i="${i}"><span>${esc(c.label)}</span><small>${esc(c.hint)}</small></li>`).join('') || '<li>Нічого не знайдено</li>';
  }
  function runPal(i) { const c = shown[i]; if (!c) return; closePal(); c.go ? (location.hash = c.go) : c.run(); }
  $('#searchBtn').onclick = openPal;
  pin.addEventListener('input', drawPal);
  plist.addEventListener('click', e => { const li = e.target.closest('[data-i]'); if (li) runPal(+li.dataset.i); });
  pal.addEventListener('click', e => { if (e.target === pal) closePal(); });
  addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); pal.hidden ? openPal() : closePal(); return; }
    if (pal.hidden) return;
    if (e.key === 'Escape') closePal();
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + shown.length) % Math.max(1, shown.length); $$('li', plist).forEach((li, i) => li.setAttribute('aria-selected', String(i === sel))); pin.setAttribute('aria-activedescendant', 'po-' + sel); }
    if (e.key === 'Enter') { e.preventDefault(); runPal(sel); }
  });

  /* ---------- onboarding ---------- */
  function openOnboarding(company) {
    const box = $('#onb'); box.hidden = false;
    const fitTenders = D.TENDERS.filter(t => t.verdict !== 'skip');
    const total = fitTenders.reduce((a, t) => a + t.value, 0);
    let step = 0; const code = (company || '').trim();
    const shell = inner => `<div class="onb__box"><button class="onb__close" type="button" aria-label="Закрити">×</button>
      <div class="onb__photo">${lp(step < 2 ? D.PHOTOS.city : D.PHOTOS.construction)}<blockquote>Ми читаємо тендери, щоб ви могли їх вигравати.</blockquote><p>Prozorro, TED, e-Zamówienia і донорські програми</p></div>
      <div class="onb__body"><div class="onb__steps">${[0, 1, 2, 3].map(i => `<i class="${i <= step ? 'on' : ''}"></i>`).join('')}</div>${inner}</div></div>`;
    const steps = [
      () => `<h2 id="onbTitle">Почнімо з вашої компанії</h2><p>Введіть код ЄДРПОУ, NIP, VAT або сайт. AI сам збере профіль з відкритих реєстрів.</p>
        <form id="onbF" class="form"><div class="field"><label for="onbCode">Код компанії або сайт</label><input id="onbCode" value="${esc(code)}" placeholder="Наприклад, 41234567" required autocomplete="organization"></div>
        <div class="onb__foot"><span style="font-size:13px;color:var(--text-3)">Демо: підійде будь-який код</span><button class="btn btn--primary btn--lg" type="submit">Знайти тендери</button></div></form>`,
      () => `<h2 id="onbTitle">Читаємо про вашу компанію</h2><p>Це займає кілька секунд.</p><ul class="scan" id="scan" style="list-style:none;padding:0;margin:0">${['Реєстр юридичних осіб: назва, КВЕД, керівник', 'Сайт компанії: послуги і кейси', 'Історія участі в Prozorro: 28 закупівель', 'Визначаємо коди CPV і регіони', 'Порівнюємо з 1 284 відкритими тендерами'].map(s => `<li><span class="sp"></span>${s}</li>`).join('')}</ul>`,
      () => `<h2 id="onbTitle">Перевірте профіль</h2><p>Ми заповнили його самі. Виправте, якщо щось не так.</p>
        <div class="form"><div class="field"><label>Компанія</label><input value="${esc(D.COMPANY.name)}" aria-label="Назва компанії"></div>
        <div class="field"><label>Напрями (CPV)</label><div class="tags">${D.COMPANY.cpv.map(c => `<span class="chip chip--good">${esc(c)}</span>`).join('')}</div></div>
        <div class="field"><label>Країни</label><div class="tags">${D.COMPANY.regions.map(c => `<span class="chip">${esc(c)}</span>`).join('')}</div></div></div>
        <div class="onb__foot"><button class="btn btn--ghost" type="button" id="onbBack">Назад</button><button class="btn btn--primary btn--lg" type="button" id="onbNext">Усе вірно</button></div>`,
      () => `<h2 id="onbTitle">Для вас уже є робота</h2><p>Відкриті тендери, що відповідають вашому профілю:</p>
        <div class="found num" id="onbSum">€0</div><p style="margin:10px 0 0;color:var(--text-2)">${fitTenders.length} тендерів у ${new Set(fitTenders.map(t => t.country)).size} країнах. Найкращий збіг — ${Math.max(...fitTenders.map(t => t.match))} зі 100.</p>
        <div class="onb__foot"><span style="font-size:13px;color:var(--text-3)">Перший дайджест — завтра о 8:00</span><button class="btn btn--primary btn--lg" type="button" id="onbDone">Відкрити мою стрічку</button></div>`
    ];
    function draw() {
      box.innerHTML = shell(steps[step]());
      $('.onb__close', box).onclick = close;
      if (step === 0) { const i = $('#onbCode', box); i.focus(); $('#onbF', box).onsubmit = e => { e.preventDefault(); step = 1; draw(); }; }
      if (step === 1) { const li = $$('#scan li', box); li.forEach((l, i) => setTimeout(() => l.classList.add('done'), reduced ? 0 : 520 * (i + 1))); setTimeout(() => { step = 2; draw(); }, reduced ? 300 : 520 * li.length + 500); }
      if (step === 2) { $('#onbBack', box).onclick = () => { step = 0; draw(); }; $('#onbNext', box).onclick = () => { step = 3; draw(); }; }
      if (step === 3) { countUp($('#onbSum', box), total, eur, 1600); $('#onbDone', box).onclick = () => { close(); location.hash = '#/tenders'; }; }
    }
    function close() { box.hidden = true; box.innerHTML = ''; S.onboarded = true; save('onboarded'); }
    box.onkeydown = e => { if (e.key === 'Escape') close(); };
    draw();
  }

  /* ---------- boot ---------- */
  const qs = new URLSearchParams(location.search);
  const REGION_UA = { UA: 'Україна', PL: 'Польща', EU: 'ЄС (TED)', DONOR: 'Донорські програми' };
  async function loadAccount(A, session) {
    const c = A.client, uid = session.user.id;
    const [{ data: prof }, { data: mem, error: memErr }] = await Promise.all([
      c.from('profiles').select('*').eq('id', uid).maybeSingle(),
      c.from('organization_members').select('role, created_at, organizations(*)').eq('user_id', uid).order('created_at').limit(1)
    ]);
    if (memErr) throw memErr;
    ACC = { client: c, uid, email: session.user.email, profile: prof || {}, invites: [] };
    const name = (prof && prof.full_name) || session.user.email.split('@')[0];
    Object.assign(D.USER, { name, initials: initials(name), role: (prof && prof.job_title) || '' });
    if (!mem || !mem.length || !mem[0].organizations) return 'no-org';
    ACC.org = mem[0].organizations; ACC.role = mem[0].role;
    const o = ACC.org;
    Object.assign(D.COMPANY, { name: o.name, code: o.reg_code || '', website: o.website || '', regions: (o.regions || []).map(r => REGION_UA[r] || r), cpv: o.industries && o.industries.length ? o.industries : D.COMPANY.cpv });
    const [{ data: st }, { data: team }, { data: inv }] = await Promise.all([
      c.from('org_state').select('data').eq('org_id', o.id).maybeSingle(),
      c.from('organization_members').select('role, user_id, profiles(full_name, job_title)').eq('org_id', o.id),
      ACC.role === 'member' ? Promise.resolve({ data: [] }) : c.from('invitations').select('email').eq('org_id', o.id)
    ]);
    const data = (st && st.data) || {};
    S.pipeline = data.pipeline || {}; S.dismissed = data.dismissed || {}; S.saved = data.saved || {}; S.checks = data.checks || {}; S.drafts = data.drafts || {};
    D.TEAM.length = 0;
    (team || []).forEach(m => { const n = (m.profiles && m.profiles.full_name) || (m.user_id === uid ? name : 'Учасник'); D.TEAM.push({ name: n, role: (m.profiles && m.profiles.job_title) || ROLE_UA[m.role], initials: initials(n) }); });
    ACC.invites = (inv || []).map(i => i.email);
    Object.keys(D.OWNERS).forEach(k => delete D.OWNERS[k]);
    return 'ok';
  }
  function createOrgModal(A) {
    const box = $('#onb'); box.hidden = false;
    box.innerHTML = `<div class="onb__box" style="grid-template-columns:1fr;max-width:520px;min-height:0"><div class="onb__body">
      <h2 id="onbTitle">Додайте вашу компанію</h2><p>Акаунт є, але він ще не прив’язаний до компанії.</p>
      <form class="form" id="coNew"><div class="field"><label for="nName">Назва компанії</label><input id="nName" required minlength="2" autocomplete="organization"></div>
      <div class="field"><label for="nCountry">Країна</label><select id="nCountry"><option value="UA">Україна</option><option value="PL">Польща</option><option value="DE">Німеччина</option><option value="LT">Литва</option><option value="RO">Румунія</option><option value="XX">Інша</option></select></div>
      <div class="field"><label for="nCode">Реєстраційний код</label><input id="nCode"></div>
      <div class="onb__foot"><button class="btn btn--ghost" type="button" id="nOut">Вийти</button><button class="btn btn--primary btn--lg" type="submit">Створити компанію</button></div></form></div></div>`;
    $('#nOut').onclick = signOut;
    $('#coNew').onsubmit = async e => {
      e.preventDefault();
      const { error } = await A.client.rpc('create_organization', { p_name: $('#nName').value.trim(), p_country: $('#nCountry').value, p_reg_code: $('#nCode').value.trim() || null });
      if (error) { toast('Не вдалося створити компанію. Спробуйте ще раз.'); return; }
      location.reload();
    };
  }
  async function boot() {
    const A = window.tenderaAuth;
    const ss = { get(k) { try { return sessionStorage.getItem(k); } catch { return null; } }, set(k, v) { try { sessionStorage.setItem(k, v); } catch { /* ignore */ } } };
    if (qs.has('demo')) ss.set('tendera.demo', '1');
    const session = A && A.configured ? (await A.client.auth.getSession()).data.session : null;
    if (A && A.configured && (session || ss.get('tendera.demo') !== '1')) {
      if (!session) { location.replace(A.siteRoot() + 'auth/?mode=login&reason=session' + (location.hash.length > 2 ? '&next=' + encodeURIComponent(location.hash) : '')); return; }
      let res;
      try { res = await loadAccount(A, session); }
      catch { document.body.classList.remove('booting'); $('#view').innerHTML = '<div class="empty"><b>Не вдалося завантажити дані компанії</b>Перевірте з’єднання і оновіть сторінку.<br><br><button class="btn btn--primary" type="button" onclick="location.reload()">Оновити</button></div>'; return; }
      A.client.auth.onAuthStateChange(ev => { if (ev === 'SIGNED_OUT') location.replace(A.siteRoot() + 'auth/?mode=login'); });
      paintAccount(); document.body.classList.remove('booting'); render();
      if (res === 'no-org') { createOrgModal(A); return; }
      if (qs.has('welcome')) toast(`Вітаємо в Tendera, ${esc(D.USER.name.split(' ')[0])}! Компанію «${esc(D.COMPANY.name)}» створено.`);
    } else {
      paintAccount(); document.body.classList.remove('booting'); render();
      if (qs.has('onboard') || !S.onboarded) openOnboarding(qs.get('company') || '');
    }
    if (qs.toString()) history.replaceState(null, '', location.pathname + location.hash);
  }
  boot();
})();

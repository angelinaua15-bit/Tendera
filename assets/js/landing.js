/* Tendera — landing. Живі дані: data/meta.json і data/tenders-*.json (оновлюються щогодини з Prozorro і TED). */
(() => {
  'use strict';
  const doc = document.documentElement;
  doc.classList.add('js');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } } };
  const nf = n => Math.round(n).toLocaleString(doc.lang === 'en' ? 'en-GB' : 'uk-UA');

  /* ---------- i18n ---------- */
  const EN = {
    skip: 'Skip to content', 'nav.how': 'How it works', 'nav.score': 'Match score', 'nav.sectors': 'Industries', 'nav.pricing': 'Pricing', 'nav.faq': 'FAQ', 'nav.login': 'Sign in', 'nav.cta': 'Register your company',
    'hero.status': 'Open Prozorro and TED tenders, every hour', 'hero.t1': 'Europe’s public tenders,', 'hero.t2': 'read for you.',
    'hero.lead': 'Every hour Tendera collects open procurements from Prozorro and TED, shows which of them fit your company, and helps your team take the bid all the way to submission.',
    'hero.label': 'Company ID or website', 'hero.ph': 'Company ID, NIP, VAT or website', 'hero.btn': 'Start free', 'hero.fine': '14 days free. No card required.',
    'card.budget': 'Budget', 'card.deadline': 'Deadline', 'card.docs': 'Documents', 'card.open': 'open tenders right now', 'card.open2': 'Open the original',
    'sources.label': 'Official open sources', 'sources.nbu': 'NBU exchange rates',
    'market.unit': ' tn', 'market.title': 'The world’s largest market is closed by complexity, not by law',
    'market.p': 'Governments spend about $13 trillion a year on contracts with companies. Most small and mid-sized companies see only a slice of it: tenders are scattered across dozens of portals and languages, and deadlines are easy to miss.', 'market.src': 'Estimate by',
    'radar.title': 'Every hour we re-read Prozorro and TED', 'radar.p': 'New notices are normalised into one schema, budgets are converted to euro at the NBU rate and matched against your company profile. Below are the most recently published tenders.', 'radar.counter': 'Total value of open tenders now',
    'how.title': 'From sign-up to a submitted bid', 'how.s1t': 'Company profile in 3 minutes', 'how.s1p': 'Register your company with its EDRPOU, NIP or VAT number, choose industries, regions and budget. The ID is checked against its checksum.',
    'how.s2t': 'A tender feed made for you', 'how.s2p': 'Every hour — new procurements from Prozorro and TED with a 0–100 match score and the reason: which CPV code, region and budget matched.',
    'how.s3t': 'Everything about a tender on one page', 'how.s3p': 'Budget and bid security, deadlines for questions and bids with a countdown, the buyer’s documents, similar open tenders and a link to the original.',
    'how.s4t': 'A bid built with your team', 'how.s4p': 'A pipeline from “New” to “Result”, a submission checklist, notes, a document library with expiry tracking and a cover-letter template.',
    'score.title': 'A match score without a black box', 'score.p': 'Every tender gets a 0–100 score from simple rules you can see in the app. You always know why a tender is in your feed.',
    'score.r1': 'The tender’s CPV code matches your industries', 'score.r1s': 'The more precise the code match, the higher the score', 'score.r2': 'The country is in your search regions', 'score.r2s': 'Ukraine via Prozorro, EU countries via TED',
    'score.r3': 'The budget is within your range', 'score.r3s': 'Converted to euro at the NBU rate', 'score.r4': 'Keywords in the title or description', 'score.r4s': 'Exclusion words hide a tender completely',
    'score.ex': 'Example: construction company, Ukraine', 'score.exT': 'Roof overhaul of a school building', 'score.e1': 'CPV 45261000 — “Construction & repair”', 'score.e2': 'Ukraine — in search regions', 'score.e3': 'Budget within range', 'score.e4': 'Keyword “roof”', 'score.total': 'Profile match',
    'sectors.title': 'For companies that build, supply and serve', 'sec.c': 'Construction & repair', 'sec.cp': 'Schools, hospitals, housing, networks.', 'sec.e': 'Energy', 'sec.ep': 'Generation, grids, efficiency.', 'sec.i': 'Roads & bridges', 'sec.ip': 'Bridges, roads, water utilities.', 'sec.t': 'IT, consulting & services', 'sec.tp': 'Software, cybersecurity, audit, training.',
    'rebuild.title': 'Ukraine and the EU in one feed', 'rebuild.p': 'Ukrainian companies see EU tenders next to Prozorro. EU companies get a clear way into procurement for Ukraine’s reconstruction. Budgets in euro, deadlines in your time zone.', 'rebuild.cta': 'Register your company', 'rebuild.cta2': 'Talk about Enterprise',
    'trust.title': 'Your documents, prices and strategy stay yours', 'trust.1t': 'Official open data', 'trust.1': 'Tenders come only from Prozorro and TED, exchange rates from the NBU. Every card links to the original notice.',
    'trust.2t': 'Isolation at the database level', 'trust.2': 'Your pipeline, notes and settings are visible only to your company’s members — enforced by the database itself.',
    'trust.3t': 'Private document storage', 'trust.3': 'Library files open only through short-lived links and only for your team.', 'trust.4t': 'A human decides', 'trust.4': 'We help you find and prepare. Your team always submits and signs.',
    'pricing.title': 'One won tender pays for years of subscription', 'pricing.m': 'Monthly', 'pricing.y': 'Yearly', 'plan.per': '/ mo', 'plan.try': 'Start free', 'plan.pop': 'Most popular',
    'plan.s.for': 'For small companies', 'plan.s.1': 'Tender feed for Ukraine or the EU', 'plan.s.2': 'Search profile and match score', 'plan.s.3': 'Pipeline and submission checklist', 'plan.s.4': '2 users',
    'plan.p.for': 'For teams bidding every month', 'plan.p.1': 'Ukraine and all EU countries', 'plan.p.2': 'Document library with expiry tracking', 'plan.p.3': 'Team notes and analytics', 'plan.p.4': '5 users',
    'plan.b.for': 'For bid teams and consultants', 'plan.b.1': 'Everything in Pro', 'plan.b.2': '15 users', 'plan.b.3': 'Help setting up your profile', 'plan.b.4': 'Priority support',
    'ent.t': 'Enterprise', 'ent.p': 'For large companies and international players in reconstruction: more users, custom support and integrations. From €1,500 per month.', 'ent.cta': 'Contact us',
    'pricing.fine': 'The first 14 days are free on every plan. We discuss payment before the trial ends — no automatic charges. Prices exclude VAT.',
    'faq.title': 'Questions we hear most', 'faq.q1': 'Where do the tenders come from?', 'faq.a1': 'From official open sources: Prozorro (public API) and TED, the EU’s official procurement journal. Data is refreshed every hour and every card links to the original.',
    'faq.q2': 'How is the match calculated?', 'faq.a2': 'From the tender’s CPV code and your industries, the country, the budget and your keywords. Next to every tender you see what matched and what did not.',
    'faq.q3': 'Do you submit the bid for us?', 'faq.a3': 'No. We help you find the tender, organise your team and miss nothing. Your team submits with its qualified signature.',
    'faq.q4': 'Which languages does Tendera support?', 'faq.a4': 'The app is in Ukrainian; the website in Ukrainian and English. TED tenders are shown in English or the original language.',
    'faq.q5': 'How long does it take to start?', 'faq.a5': 'About three minutes: register the company, confirm your email and choose industries. Your tender feed appears right away.',
    'final.t1': 'While you read this,', 'final.t2': 'someone is publishing a tender for you.',
    'footer.p': 'Open Prozorro and TED tenders for companies in Ukraine and the EU.', 'footer.brand': 'Brand kit', 'footer.privacy': 'Privacy', 'footer.terms': 'Terms', 'footer.data': 'Data: Prozorro, TED, NBU.', 'footer.photos': 'Photos:', 'footer.map': 'Map: Natural Earth.'
  };
  const UA = {};
  $$('[data-i18n]').forEach(el => { UA[el.dataset.i18n] = el.innerHTML; });
  $$('[data-i18n-ph]').forEach(el => { UA[el.dataset.i18nPh] = el.placeholder; });
  let lang = 'uk';
  function setLang(l) {
    lang = l; const dict = l === 'en' ? EN : UA;
    $$('[data-i18n]').forEach(el => { const v = dict[el.dataset.i18n]; if (v != null) el.innerHTML = v; });
    $$('[data-i18n-ph]').forEach(el => { const v = dict[el.dataset.i18nPh]; if (v != null) el.placeholder = v; });
    doc.lang = l === 'en' ? 'en' : 'uk';
    $$('[data-lang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === l)));
    store.set('tendera.lang', l);
    paintLive();
  }
  $$('[data-lang]').forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang)));

  /* ---------- nav ---------- */
  const nav = $('#nav');
  const onScroll = () => nav.classList.toggle('is-solid', scrollY > 24);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const burger = $('.nav__burger'), menu = $('#mobile-menu');
  burger.addEventListener('click', () => { const open = burger.getAttribute('aria-expanded') !== 'true'; burger.setAttribute('aria-expanded', String(open)); menu.hidden = !open; });
  $$('a', menu).forEach(a => a.addEventListener('click', () => { burger.setAttribute('aria-expanded', 'false'); menu.hidden = true; }));

  /* ---------- living photos ---------- */
  $$('.live-photo img').forEach(img => { const fail = () => img.classList.add('is-broken'); if (img.complete && img.naturalWidth === 0 && img.src) fail(); img.addEventListener('error', fail, { once: true }); });
  if (!reduced) {
    const photos = $$('[data-parallax]'); let mx = 0, my = 0, raf = 0;
    const schedule = () => { if (!raf) raf = requestAnimationFrame(apply); };
    addEventListener('pointermove', e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; schedule(); }, { passive: true });
    addEventListener('scroll', schedule, { passive: true });
    function apply() { raf = 0; photos.forEach(p => { const r = p.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return; const sc = ((r.top + r.height / 2) / innerHeight - .5); p.style.setProperty('--px', (mx * -14).toFixed(1) + 'px'); p.style.setProperty('--py', (my * -10 + sc * -36).toFixed(1) + 'px'); }); }
    apply();
  }
  requestAnimationFrame(() => setTimeout(() => doc.classList.add('is-loaded'), 60));

  /* ---------- live data ---------- */
  const LIVE = { meta: null, items: [], ready: false };
  const CUR = { UAH: '₴', EUR: '€', USD: '$', GBP: '£' };
  const money = (v, cur) => v == null ? (lang === 'en' ? 'not stated' : 'не вказано') : (CUR[cur] ? `${CUR[cur]} ${nf(v)}` : `${nf(v)} ${cur}`);
  const eurOf = t => t.v == null ? null : t.cur === 'EUR' ? t.v : (LIVE.meta && LIVE.meta.toEur && LIVE.meta.toEur[t.cur] ? t.v * LIVE.meta.toEur[t.cur] : null);
  const eurShort = v => lang === 'en'
    ? (v >= 1e9 ? '€' + (v / 1e9).toFixed(1) + 'bn' : v >= 1e6 ? '€' + (v / 1e6).toFixed(1) + 'm' : '€' + nf(v))
    : (v >= 1e9 ? '€' + (v / 1e9).toLocaleString('uk-UA', { maximumFractionDigits: 1 }) + ' млрд' : v >= 1e6 ? '€' + (v / 1e6).toLocaleString('uk-UA', { maximumFractionDigits: 1 }) + ' млн' : '€' + nf(v));
  const ago = iso => { const m = Math.max(1, Math.round((Date.now() - Date.parse(iso)) / 6e4)); const h = Math.round(m / 60);
    return lang === 'en' ? (m < 60 ? `${m} min ago` : h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`) : (m < 60 ? `${m} хв тому` : h < 24 ? `${h} год тому` : `${Math.round(h / 24)} дн. тому`); };
  const days = t => Math.ceil((Date.parse(t.end) - Date.now()) / 864e5);
  const plural = (n, a, b, c) => { const m10 = n % 10, m100 = n % 100; if (m10 === 1 && m100 !== 11) return a; if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return b; return c; };
  const inDays = d => lang === 'en' ? `in ${d} day${d === 1 ? '' : 's'}` : `через ${d} ${plural(d, 'день', 'дні', 'днів')}`;

  let typeTimer = 0;
  function typeInto(el, text) {
    clearTimeout(typeTimer); if (reduced) { el.textContent = text; return; }
    let i = 0; el.textContent = '';
    const tick = () => { el.textContent = text.slice(0, ++i); if (i < text.length) typeTimer = setTimeout(tick, 14 + Math.random() * 26); };
    typeTimer = setTimeout(tick, 900);
  }
  const heroPick = () => (LIVE.meta.hero || []).filter(t => days(t) >= 1)[0] || LIVE.items[0];
  function paintLive() {
    if (!LIVE.ready) return;
    const M = LIVE.meta || {}; const total = M.counts ? M.counts.ua + M.counts.eu : 0;
    if (total) $('#liveStatus').textContent = lang === 'en' ? `${nf(total)} open tenders in Prozorro and TED · updated ${ago(M.generatedAt)}` : `${nf(total)} відкритих тендерів у Prozorro і TED · оновлено ${ago(M.generatedAt)}`;
    const t = heroPick();
    if (t) {
      $('#hcSource').textContent = t.src === 'prozorro' ? 'Prozorro' : 'TED';
      $('#hcAgo').textContent = t.pub ? ago(t.pub) : '';
      $('#hcTitle').textContent = t.t;
      $('#hcValue').textContent = money(t.v, t.cur);
      $('#hcDeadline').textContent = inDays(days(t));
      $('#hcDocs').textContent = t.docs ? String(t.docs) : '—';
      typeInto($('#typed'), (t.b ? t.b + '. ' : '') + (t.d || '').slice(0, 170) + ((t.d || '').length > 170 ? '…' : ''));
      $('#heroLink').href = t.url; $('#heroCard').hidden = false; $('#heroLink').hidden = false;
      $('#hcCount').textContent = nf(total); $('#heroCount').hidden = false;
    }
    const sum = M.totalEur || 0;
    if (sum) { $('#mapValue').textContent = eurShort(sum); $('#mapCounter').hidden = false; }
    $('#feedNote').textContent = M.generatedAt ? (lang === 'en' ? `Sources: Prozorro and TED. Updated ${ago(M.generatedAt)}.` : `Джерела: Prozorro і TED. Оновлено ${ago(M.generatedAt)}.`) : '';
    feedIdx = 0; $('#feed').innerHTML = ''; for (let i = 0; i < 5; i++) pushFeed();
  }
  let feedList = [], feedIdx = 0;
  function pushFeed() {
    if (!feedList.length) return;
    const t = feedList[feedIdx++ % feedList.length]; const feed = $('#feed');
    const li = document.createElement('li');
    li.innerHTML = '<span class="flag"></span><a class="t" target="_blank" rel="noopener"></a><span class="v"></span>';
    li.querySelector('.flag').textContent = t.cc; const a = li.querySelector('.t'); a.textContent = t.t; a.href = t.url;
    li.querySelector('.v').textContent = t.v != null ? eurShort(eurOf(t) || 0) : '—';
    feed.prepend(li); while (feed.children.length > 5) feed.lastElementChild.remove();
    addPing(t);
  }
  async function loadLive() {
    const r = await fetch('data/summary.json', { cache: 'no-cache' }); if (!r.ok) return;
    LIVE.meta = await r.json();
    const now = Date.now();
    LIVE.items = (LIVE.meta.latest || []).filter(t => t && t.end && Date.parse(t.end) > now);
    feedList = [...LIVE.items].reverse();
    allPins = (LIVE.meta.pins || []).map(([k, v]) => pinOf(k === 'u' ? { src: 'prozorro', r: v } : { src: 'ted', cc: v })).filter(Boolean);
    LIVE.ready = true; paintLive();
  }

  /* ---------- Europe map with real tender locations ---------- */
  const UA_REG = { 'Вінницька': [28.47, 49.23], 'Волинська': [25.33, 50.75], 'Дніпропетровська': [35.04, 48.46], 'Донецька': [37.8, 48.0], 'Житомирська': [28.66, 50.25], 'Закарпатська': [22.29, 48.62], 'Запорізька': [35.14, 47.84], 'Івано-Франківська': [24.71, 48.92], 'Київська': [30.3, 50.3], 'Кіровоградська': [32.26, 48.51], 'Луганська': [39.3, 48.57], 'Львівська': [24.03, 49.84], 'Миколаївська': [31.99, 46.97], 'Одеська': [30.73, 46.48], 'Полтавська': [34.55, 49.59], 'Рівненська': [26.25, 50.62], 'Сумська': [34.8, 50.91], 'Тернопільська': [25.59, 49.55], 'Харківська': [36.23, 49.99], 'Херсонська': [32.62, 46.64], 'Хмельницька': [26.98, 49.42], 'Черкаська': [32.06, 49.44], 'Чернівецька': [25.94, 48.29], 'Чернігівська': [31.29, 51.49], 'Київ': [30.52, 50.45] };
  const EU_CAP = { PL: [21.01, 52.23], DE: [13.4, 52.52], LT: [25.28, 54.69], LV: [24.1, 56.95], EE: [24.75, 59.44], CZ: [14.42, 50.08], SK: [17.11, 48.15], RO: [26.1, 44.43], AT: [16.37, 48.21], NL: [4.9, 52.37], HU: [19.04, 47.5], BG: [23.32, 42.7], SI: [14.51, 46.06], HR: [15.98, 45.81], FR: [2.35, 48.86], IT: [12.5, 41.9], ES: [-3.7, 40.42], BE: [4.35, 50.85], SE: [18.07, 59.33], FI: [24.94, 60.17], DK: [12.57, 55.68], IE: [-6.26, 53.35], PT: [-9.14, 38.72], GR: [23.73, 37.98], LU: [6.13, 49.61] };
  function project(lon, lat) {
    const r = Math.PI / 180, l0 = 16 * r, p0 = 53 * r, l = lon * r, p = lat * r;
    const k = Math.sqrt(2 / (1 + Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(l - l0)));
    return [520 + 1250 * k * Math.cos(p) * Math.sin(l - l0), 420 - 1250 * k * (Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(l - l0))];
  }
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  function pinOf(t) { const ll = t.src === 'prozorro' ? UA_REG[t.r] : EU_CAP[t.cc]; if (!ll) return null; const [x, y] = project(ll[0], ll[1]); return { x: x + (rnd() - .5) * 26, y: y + (rnd() - .5) * 22, ua: t.src === 'prozorro' }; }
  let allPins = [], pings = [];
  const canvas = $('#map'); const E = window.EUROPE;
  let addPing = () => { };
  if (canvas && E) {
    const ctx = canvas.getContext('2d'); let W = 0, H = 0, dpr = 1, scale = 1, base = null, visible = false, raf = 0;
    function resize() {
      const r = canvas.getBoundingClientRect(); dpr = Math.min(2, devicePixelRatio || 1); W = r.width; H = r.height; canvas.width = W * dpr; canvas.height = H * dpr; scale = W / E.w;
      base = document.createElement('canvas'); base.width = Math.max(1, W * dpr); base.height = Math.max(1, H * dpr);
      const b = base.getContext('2d'); b.scale(dpr, dpr); b.fillStyle = 'rgba(169,190,196,.34)'; b.beginPath(); const rr = Math.max(.9, 2.1 * scale);
      for (let i = 0; i < E.dots.length; i += 2) { const x = E.dots[i] * scale, y = E.dots[i + 1] * scale; b.moveTo(x + rr, y); b.arc(x, y, rr, 0, 6.283); } b.fill();
      draw(performance.now());
    }
    function draw(tm) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H); if (base) ctx.drawImage(base, 0, 0, W, H);
      ctx.globalAlpha = .55; allPins.forEach(p => { ctx.fillStyle = p.ua ? '#C8A46A' : '#6FD1BF'; ctx.fillRect(p.x * scale - 1, p.y * scale - 1, 2, 2); }); ctx.globalAlpha = 1;
      pings.forEach(p => {
        const x = p.x * scale, y = p.y * scale, col = p.ua ? '226,195,142' : '111,209,191', age = (tm - p.t0) / 1000;
        const g = ctx.createRadialGradient(x, y, 0, x, y, 30 * scale + 10); g.addColorStop(0, `rgba(${col},.35)`); g.addColorStop(1, `rgba(${col},0)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 30 * scale + 10, 0, 6.283); ctx.fill();
        ctx.fillStyle = `rgba(${col},1)`; ctx.beginPath(); ctx.arc(x, y, 3.4, 0, 6.283); ctx.fill();
        if (age < 2.4 && !reduced) { const k = age / 2.4; ctx.strokeStyle = `rgba(${col},${.9 * (1 - k)})`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, y, 4 + k * 56 * scale, 0, 6.283); ctx.stroke(); }
      });
    }
    addPing = t => { const p = pinOf(t); if (!p) return; p.t0 = performance.now(); pings.push(p); if (pings.length > 8) pings.shift(); };
    let last = 0;
    function loop(tm) { if (!visible) return; if (LIVE.ready && feedList.length && tm - last > 2600) { if (last) pushFeed(); last = tm; } draw(tm); raf = requestAnimationFrame(loop); }
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) { if (reduced) draw(1e12); else raf = requestAnimationFrame(loop); } else cancelAnimationFrame(raf); }, { threshold: .1 }).observe(canvas);
    addEventListener('resize', resize); resize();
  }

  /* ---------- scrollytelling ---------- */
  const steps = $$('.how__step'); const frames = $$('.how__frame .live-photo'); const bar = $('#howBar');
  if (steps.length) {
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (!e.isIntersecting) return; const n = +e.target.dataset.step;
      steps.forEach(s => s.classList.toggle('is-active', s === e.target));
      frames.forEach(f => f.classList.toggle('is-active', +f.dataset.step === n));
      if (bar) bar.style.width = ((n + 1) / steps.length * 100) + '%';
    }), { rootMargin: '-45% 0px -45% 0px' });
    steps.forEach(s => io.observe(s));
  }

  /* ---------- score rules reveal ---------- */
  const anatomy = $('#anatomy');
  if (anatomy) new IntersectionObserver(([e], obs) => {
    if (!e.isIntersecting) return; obs.disconnect();
    $$('.extract li', anatomy).forEach((li, i) => setTimeout(() => li.classList.add('is-lit'), reduced ? 0 : 250 + i * 380));
    $$('.score-rows div', anatomy).forEach((row, i) => setTimeout(() => row.classList.add('is-lit'), reduced ? 0 : 450 + i * 380));
  }, { threshold: .3 }).observe(anatomy);

  /* ---------- pricing toggle ---------- */
  $$('[data-billing]').forEach(b => b.addEventListener('click', () => {
    const y = b.dataset.billing === 'year';
    $$('[data-billing]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    $$('.plan__price b').forEach(el => { el.textContent = '€' + (y ? el.dataset.y : el.dataset.m); });
  }));

  /* ---------- contact ---------- */
  const cfg = window.TENDERA_CONFIG || {}; const cb = $('#contactBtn');
  if (cb) cb.href = cfg.contactEmail ? `mailto:${cfg.contactEmail}?subject=${encodeURIComponent(cfg.contactSubject || 'Tendera')}` : 'auth/?mode=signup';

  if (store.get('tendera.lang') === 'en') setLang('en');
  loadLive().catch(() => { /* сайт працює і без живих даних */ });
})();

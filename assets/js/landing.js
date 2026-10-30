/* Tendera — landing interactions */
(() => {
  'use strict';
  const doc = document.documentElement;
  doc.classList.add('js');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } }
  };

  /* ---------- i18n (UA default, EN) ---------- */
  const EN = {
    skip: 'Skip to content', 'nav.how': 'How it works', 'nav.ai': 'AI brief', 'nav.sectors': 'Industries', 'nav.pricing': 'Pricing', 'nav.faq': 'FAQ', 'nav.login': 'Sign in', 'nav.cta': 'Open demo',
    'hero.status': 'Early access for companies in Ukraine, Poland and the EU',
    'hero.t1': 'Europe’s public tenders,', 'hero.t2': 'read for you.',
    'hero.lead': 'Every morning Tendera finds the procurements your company can actually win, explains the requirements in 30 seconds and prepares the bid. No bid department, no 300-page documents.',
    'hero.label': 'Company ID or website', 'hero.ph': 'Company ID, NIP, VAT or website', 'hero.btn': 'Find my tenders', 'hero.fine': '14 days free. No card required.',
    'card.title': 'AI brief ready', 'card.subject': 'Hospital heating system reconstruction, Lviv', 'card.budget': 'Budget', 'card.deadline': 'Deadline', 'card.deadlineV': 'in 16 days', 'card.pages': 'Documents', 'card.pagesV': '214 pages', 'card.match': 'profile match', 'card.verdict': 'Recommended to bid', 'card.sr': 'Example: AI read 214 pages in 27 seconds and recommends bidding.',
    'sources.label': 'We read official sources', 'sources.wb': 'World Bank', 'sources.ebrd': 'EBRD', 'sources.undp': 'UNDP',
    'market.unit': ' tn', 'market.title': 'The world’s largest market is closed by complexity, not by law',
    'market.p': 'Governments spend about $13 trillion a year on contracts with companies. Most small and mid-sized companies see only a slice of it: tenders are scattered across dozens of portals and languages, and one missing certificate means disqualification.',
    'market.src': 'Estimate by',
    'radar.title': 'Every 30 minutes we re-read Europe', 'radar.p': 'New notices from Prozorro, TED and national portals are normalised into one schema, translated into your language and matched against your company profile. You only see what fits.', 'radar.note': 'Visualisation on demo data.', 'radar.counter': 'Open opportunities for your profile',
    'how.title': 'From a company ID to a ready bid', 'how.s1t': 'Profile in 3 minutes', 'how.s1p': 'Enter your company ID. AI finds your industries, CPV codes, regions and track record from open registries and your website. You just confirm.',
    'how.s2t': 'Morning shortlist at 8:00', 'how.s2p': 'Every morning 3–10 tenders arrive by email and Telegram, each with a 0–100 match score and a reason why it fits you.',
    'how.s3t': 'A decision in a minute', 'how.s3p': 'A one-page AI brief: what is bought, budget, qualification, guarantees, risks. And an honest verdict: bid or not, and what you are missing.',
    'how.s4t': 'A bid that is 80% done', 'how.s4p': 'A document checklist, drafts from your library and a compliance check before submission. The final call is always yours.',
    'brief.title': 'Every claim has a page and a clause', 'brief.p': 'AI doesn’t invent. It extracts requirements with a link to the source, and says so when the answer isn’t there. Trust matters more than speed.',
    'brief.docName': 'Tender documentation', 'brief.docH': 'Section 3. Qualification criteria',
    'brief.d1': '3.1. The bidder must have completed at least one similar contract within the last 3 years.', 'brief.d2': '3.2. The bidder provides a bank guarantee securing the bid of 0.5% of the estimated value.', 'brief.d3': '3.3. Equipment required for the works is confirmed by a free-form statement.', 'brief.d4': '3.4. The works must be completed within 120 calendar days of signing.', 'brief.d5': '3.5. At least two employees hold technical supervision engineer certificates.', 'brief.d6': '3.6. Documents are submitted electronically with a qualified electronic signature…',
    'brief.e1t': 'Guarantee', 'brief.e1': 'Bank guarantee 0.5% — ₴ 243,000', 'brief.e2t': 'Risk', 'brief.e2': '120 days for works that usually take 180', 'brief.e3t': 'Team', 'brief.e3': '2 supervision engineers — both are in your library',
    'sectors.title': 'For companies that build, supply and serve', 'sec.c': 'Construction & repair', 'sec.cp': 'Schools, hospitals, housing, networks. CPV 45000000.', 'sec.e': 'Energy', 'sec.ep': 'Generation, grids, efficiency. CPV 09300000.', 'sec.i': 'Infrastructure', 'sec.ip': 'Bridges, roads, water utilities. CPV 45221000.', 'sec.t': 'IT, consulting & services', 'sec.tp': 'Software, cybersecurity, audit, training. CPV 72000000.',
    'rebuild.title': 'Rebuilding Ukraine means tenders that are being published now', 'rebuild.p': 'For international companies Tendera is a guide to Prozorro and donor procedures: World Bank, EBRD, UNDP. For Ukrainian companies it opens EU tenders. Consortium partners can be found on the platform.', 'rebuild.cta': 'Talk about Enterprise', 'rebuild.cta2': 'Browse tenders in the demo',
    'trust.title': 'Your documents, prices and strategy stay yours', 'trust.1t': 'Data in the EU', 'trust.1': 'Database, files and processing in the EU region. A data processing agreement for every customer.', 'trust.2t': 'No training on your data', 'trust.2': 'Company documents are never used to train models and never appear in other customers’ answers.', 'trust.3t': 'Isolation & encryption', 'trust.3': 'Separate storage per company, encryption at rest and in transit, an audit log.', 'trust.4t': 'A human decides', 'trust.4': 'AI prepares and checks; your team always submits and signs.',
    'pricing.title': 'One won tender pays for years of subscription', 'pricing.m': 'Monthly', 'pricing.y': 'Yearly', 'plan.per': '/ mo', 'plan.try': 'Start trial', 'plan.pop': 'Most popular',
    'plan.s.for': 'For small companies', 'plan.s.1': '1 country, unlimited feed', 'plan.s.2': 'AI briefs and bid / no-bid verdict', 'plan.s.3': 'Chat with documents, 50 questions', 'plan.s.4': 'Telegram digest, 2 users',
    'plan.p.for': 'For teams bidding every month', 'plan.p.1': 'All countries and donor programmes', 'plan.p.2': 'Winner and price analytics', 'plan.p.3': 'Pipeline and document library', 'plan.p.4': 'AI bid drafts, 20 per month', 'plan.p.5': '5 users',
    'plan.b.for': 'For bid teams and consultants', 'plan.b.1': 'Unlimited drafts', 'plan.b.2': 'Compliance check before submission', 'plan.b.3': 'API and CRM integrations', 'plan.b.4': '15 users, client profiles',
    'ent.t': 'Enterprise', 'ent.p': 'SSO, SLA, a dedicated manager, custom data sources and team onboarding. For large companies and international players in reconstruction. From €1,500 per month.', 'ent.cta': 'Book a demo', 'pricing.fine': 'Prices exclude VAT. Payment in UAH is available for Ukraine.',
    'faq.title': 'Questions we hear most', 'faq.q1': 'Where do the tenders come from?', 'faq.a1': 'Only official open sources: Prozorro, TED (EU tenders), national portals and donor programmes. We keep a link to the original of every notice.', 'faq.q2': 'Can I trust the AI brief?', 'faq.a2': 'Every requirement links to its page and clause, so you can verify it in seconds. Critical items are flagged for manual review.', 'faq.q3': 'Do you submit the bid for us?', 'faq.a3': 'No. We prepare the package and drafts; your team always submits with its qualified signature.', 'faq.q4': 'Which languages does Tendera support?', 'faq.a4': 'The interface is in Ukrainian, English and Polish. Tenders in any EU language are translated into your team’s language.', 'faq.q5': 'How long does it take to start?', 'faq.a5': 'About three minutes: enter your company ID, confirm the profile, and your first shortlist is ready.',
    'final.t1': 'While you read this,', 'final.t2': 'someone is publishing a tender for you.',
    'footer.p': 'An AI platform for public and donor tenders in Europe.', 'footer.app': 'App demo', 'footer.brand': 'Brand kit', 'footer.photos': 'Photos:', 'footer.map': 'Map: Natural Earth.'
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
    restartTyping();
  }
  $$('[data-lang]').forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang)));

  /* ---------- nav ---------- */
  const nav = $('#nav');
  const onScroll = () => nav.classList.toggle('is-solid', scrollY > 24);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const burger = $('.nav__burger'), menu = $('#mobile-menu');
  burger.addEventListener('click', () => { const open = burger.getAttribute('aria-expanded') !== 'true'; burger.setAttribute('aria-expanded', String(open)); menu.hidden = !open; });
  $$('a', menu).forEach(a => a.addEventListener('click', () => { burger.setAttribute('aria-expanded', 'false'); menu.hidden = true; }));

  /* ---------- images: graceful fallback ---------- */
  $$('.live-photo img').forEach(img => {
    const fail = () => img.classList.add('is-broken');
    if (img.complete && img.naturalWidth === 0 && img.src) fail();
    img.addEventListener('error', fail, { once: true });
  });

  /* ---------- living photos: pointer + scroll parallax ---------- */
  if (!reduced) {
    const photos = $$('[data-parallax]');
    let mx = 0, my = 0, raf = 0;
    addEventListener('pointermove', e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; schedule(); }, { passive: true });
    addEventListener('scroll', () => schedule(), { passive: true });
    function schedule() { if (!raf) raf = requestAnimationFrame(apply); }
    function apply() {
      raf = 0;
      photos.forEach(p => {
        const r = p.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) return;
        const sc = ((r.top + r.height / 2) / innerHeight - .5);
        p.style.setProperty('--px', (mx * -14).toFixed(1) + 'px');
        p.style.setProperty('--py', (my * -10 + sc * -36).toFixed(1) + 'px');
      });
    }
    apply();
  }

  /* ---------- hero entrance + AI typing ---------- */
  const typedEl = $('#typed');
  const TYPED = {
    uk: 'Ви відповідаєте 7 з 8 вимог. Бракує банківської гарантії 0,5% — її можна оформити за 3 дні. Конкуренція низька: зазвичай 2–3 учасники.',
    en: 'You meet 7 of 8 requirements. Missing: a 0.5% bank guarantee — it takes about 3 days to arrange. Competition is low: usually 2–3 bidders.'
  };
  let typeTimer = 0;
  function restartTyping() {
    clearTimeout(typeTimer);
    const text = TYPED[lang] || TYPED.uk;
    if (reduced) { typedEl.textContent = text; return; }
    let i = 0; typedEl.textContent = '';
    const tick = () => { typedEl.textContent = text.slice(0, ++i); if (i < text.length) typeTimer = setTimeout(tick, 18 + Math.random() * 34); };
    typeTimer = setTimeout(tick, 1500);
  }
  function countUp(el, to, { prefix = '', dur = 1600, fmt = n => Math.round(n).toLocaleString('uk-UA') } = {}) {
    if (reduced) { el.textContent = prefix + fmt(to); return; }
    const t0 = performance.now();
    const step = t => { const k = Math.min(1, (t - t0) / dur); const e = 1 - Math.pow(1 - k, 4); el.textContent = prefix + fmt(to * e); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  requestAnimationFrame(() => setTimeout(() => {
    doc.classList.add('is-loaded');
    setTimeout(() => { $('#heroRing').style.strokeDashoffset = String(125.66 * (1 - .92)); countUp($('#heroScore'), 92, { dur: 1800 }); }, 1250);
  }, 60));

  /* ---------- Europe radar map ---------- */
  const canvas = $('#map');
  const E = window.EUROPE;
  const DEMO = [
    ['UA', 'Lviv', 'Реконструкція теплопостачання лікарні', 'Hospital heating reconstruction', 1.32e6],
    ['PL', 'Krakow', 'Modernizacja oświetlenia ulicznego LED', 'LED street lighting upgrade', 2.1e6],
    ['DE', 'Berlin', 'IT-Sicherheitsaudit für Bezirksamt', 'IT security audit, district office', 0.48e6],
    ['UA', 'Kyiv', 'Постачання модульних котелень', 'Modular boiler houses supply', 3.4e6],
    ['LT', 'Vilnius', 'Mokyklos stogo renovacija', 'School roof renovation', 0.62e6],
    ['RO', 'Bucharest', 'Reabilitare pod rutier DN1', 'Road bridge rehabilitation', 5.8e6],
    ['UA', 'Odesa', 'Відновлення водоканалу, лот 2', 'Water utility restoration, lot 2', 2.7e6],
    ['CZ', 'Prague', 'Dodávka zdravotnické techniky', 'Medical equipment supply', 0.94e6],
    ['PL', 'Gdansk', 'Budowa farmy fotowoltaicznej 4 MW', '4 MW solar farm construction', 3.1e6],
    ['UA', 'Kharkiv', 'Ремонт школи після пошкоджень', 'School repair after damage', 1.05e6],
    ['NL', 'Amsterdam', 'Cloud migration, municipal services', 'Cloud migration, municipal services', 1.6e6],
    ['UA', 'Dnipro', 'Енергоефективна модернізація ЦНАП', 'Energy retrofit of service centre', 0.71e6],
    ['AT', 'Vienna', 'Facility management, 3 Jahre', 'Facility management, 3 years', 1.2e6],
    ['SK', 'Bratislava', 'Rekonštrukcia električkovej trate', 'Tram line reconstruction', 7.4e6],
    ['UA', 'Kyiv', 'Кібербезпека для ЦОВВ, рамкова угода', 'Cybersecurity framework agreement', 0.88e6]
  ];
  if (canvas && E) {
    const ctx = canvas.getContext('2d');
    let W = 0, H = 0, dpr = 1, scale = 1, base = null;
    const pings = []; let total = 0, last = 0, idx = 0, visible = false;
    const valueEl = $('#mapValue'), feed = $('#feed');
    function resize() {
      const r = canvas.getBoundingClientRect(); dpr = Math.min(2, devicePixelRatio || 1);
      W = r.width; H = r.height; canvas.width = W * dpr; canvas.height = H * dpr; scale = W / E.w;
      base = document.createElement('canvas'); base.width = Math.max(1, W * dpr); base.height = Math.max(1, H * dpr);
      const b = base.getContext('2d'); b.scale(dpr, dpr); b.fillStyle = 'rgba(169,190,196,.34)'; b.beginPath(); const rr = Math.max(.9, 2.1 * scale);
      for (let i = 0; i < dots.length; i += 2) { const x = dots[i] * scale, y = dots[i + 1] * scale; b.moveTo(x + rr, y); b.arc(x, y, rr, 0, 6.283); }
      b.fill(); draw(performance.now());
    }
    const dots = E.dots;
    function draw(t) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      if (base) ctx.drawImage(base, 0, 0, W, H);
      for (let i = pings.length - 1; i >= 0; i--) {
        const p = pings[i]; const age = (t - p.t0) / 1000;
        const [x, y] = [p.x * scale, p.y * scale];
        const glow = ctx.createRadialGradient(x, y, 0, x, y, 26 * scale + 10);
        glow.addColorStop(0, p.c.replace('A', '.35')); glow.addColorStop(1, p.c.replace('A', '0'));
        ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y, 26 * scale + 10, 0, 6.283); ctx.fill();
        ctx.fillStyle = p.c.replace('A', '1'); ctx.beginPath(); ctx.arc(x, y, 3.2, 0, 6.283); ctx.fill();
        if (age < 2.4 && !reduced) { const k = age / 2.4; ctx.strokeStyle = p.c.replace('A', String(.9 * (1 - k))); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, y, 4 + k * 46 * scale + k * 10, 0, 6.283); ctx.stroke(); }
      }
    }
    function addPing(t) {
      const d = DEMO[idx % DEMO.length]; idx++;
      const c = E.cities[d[1]] || [500, 400];
      const jitter = () => (Math.random() - .5) * 18;
      const isUA = d[0] === 'UA';
      pings.push({ x: c[0] + jitter(), y: c[1] + jitter(), t0: t, c: isUA ? 'rgba(226,195,142,A)' : 'rgba(111,209,191,A)' });
      if (pings.length > 26) pings.shift();
      total += d[4]; countTo(total);
      const li = document.createElement('li');
      li.innerHTML = `<span class="flag">${d[0]}</span><span class="t"></span><span class="v">€${(d[4] / 1e6).toFixed(2)} млн</span>`;
      li.querySelector('.t').textContent = lang === 'en' ? d[3] : d[2];
      if (lang === 'en') li.querySelector('.v').textContent = `€${(d[4] / 1e6).toFixed(2)}m`;
      feed.prepend(li); while (feed.children.length > 5) feed.lastElementChild.remove();
    }
    let shown = 0;
    function countTo(v) { const from = shown; const t0 = performance.now(); const go = t => { const k = Math.min(1, (t - t0) / 900); shown = from + (v - from) * (1 - Math.pow(1 - k, 3)); valueEl.textContent = '€' + Math.round(shown).toLocaleString('uk-UA'); if (k < 1) requestAnimationFrame(go); }; requestAnimationFrame(go); }
    function loop(t) {
      if (!visible) return;
      if (t - last > 1700 || !last) { addPing(t); last = t; }
      draw(t); requestAnimationFrame(loop);
    }
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) { if (reduced) { for (let i = 0; i < 8; i++) addPing(0); draw(1e9); } else requestAnimationFrame(loop); } }, { threshold: .15 }).observe(canvas);
    addEventListener('resize', resize); resize();
    for (let i = 0; i < 4; i++) { addPing(-5000); }
  }

  /* ---------- scrollytelling ---------- */
  const steps = $$('.how__step'); const frames = $$('.how__frame .live-photo'); const bar = $('#howBar');
  if (steps.length) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const n = +e.target.dataset.step;
        steps.forEach(s => s.classList.toggle('is-active', s === e.target));
        frames.forEach(f => f.classList.toggle('is-active', +f.dataset.step === n));
        if (bar) bar.style.width = ((n + 1) / steps.length * 100) + '%';
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    steps.forEach(s => io.observe(s));
  }

  /* ---------- AI extraction reveal ---------- */
  const anatomy = $('#anatomy');
  if (anatomy) {
    const marks = $$('mark', anatomy), items = $$('.extract li', anatomy);
    new IntersectionObserver(([e], obs) => {
      if (!e.isIntersecting) return; obs.disconnect();
      [0, 1, 2].forEach(k => setTimeout(() => {
        marks.filter(m => m.dataset.k == k).forEach(m => m.classList.add('is-lit'));
        items.filter(i => i.dataset.k == k).forEach(i => i.classList.add('is-lit'));
      }, reduced ? 0 : 350 + k * 650));
    }, { threshold: .35 }).observe(anatomy);
  }

  /* ---------- pricing toggle ---------- */
  $$('[data-billing]').forEach(b => b.addEventListener('click', () => {
    const y = b.dataset.billing === 'year';
    $$('[data-billing]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    $$('.plan__price b').forEach(el => { el.textContent = '€' + (y ? el.dataset.y : el.dataset.m); });
  }));

  /* ---------- contact ---------- */
  const cfg = window.TENDERA_CONFIG || {};
  const cb = $('#contactBtn');
  if (cb) {
    if (cfg.contactEmail) cb.href = `mailto:${cfg.contactEmail}?subject=${encodeURIComponent(cfg.contactSubject || 'Tendera')}`;
    else cb.href = 'app/?onboard=1&plan=enterprise';
  }

  /* ---------- start ---------- */
  const saved = store.get('tendera.lang');
  if (saved === 'en') setLang('en'); else restartTyping();
})();

#!/usr/bin/env node
/*
 * Tendera — збір відкритих тендерів з офіційних джерел.
 *   Prozorro (Україна): https://public-api.prozorro.gov.ua/api/2.5/tenders
 *   TED (ЄС):          POST https://api.ted.europa.eu/v3/notices/search
 *   Курси НБУ:          https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json
 * Результат: data/tenders-ua.json, data/tenders-eu.json, data/meta.json
 * Запускається в GitHub Actions щогодини. Node 20+, без залежностей.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.DATA_DIR || path.join(ROOT, 'data');
const UA_API = 'https://public-api.prozorro.gov.ua/api/2.5';
const TED_API = 'https://api.ted.europa.eu/v3/notices/search';
const NBU_API = 'https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json';
const SITE = process.env.SITE_URL || (process.env.GITHUB_REPOSITORY ? `https://${process.env.GITHUB_REPOSITORY.split('/')[0].toLowerCase()}.github.io/${process.env.GITHUB_REPOSITORY.split('/')[1]}/` : '');
const UA_PAGES = +(process.env.UA_FEED_PAGES || 40);           // сторінок стрічки змін по 1000
const UA_MAX = +(process.env.UA_MAX_TENDERS || 6000);           // максимум тендерів у файлі
const UA_MIN_UAH = +(process.env.UA_MIN_VALUE_UAH || 100000);   // відсікаємо дрібні закупівлі
const TED_DAYS = +(process.env.TED_DAYS || 21);
const TED_PAGES = +(process.env.TED_PAGES_PER_COUNTRY || 3);
const BUDGET_MS = +(process.env.TIME_BUDGET_MS || 15 * 60 * 1000);
const started = Date.now();
const timeLeft = () => BUDGET_MS - (Date.now() - started);
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

export const UA_TYPES = {
  aboveThreshold: 'Відкриті торги з особливостями', aboveThresholdUA: 'Відкриті торги', aboveThresholdEU: 'Відкриті торги з публікацією англ. мовою',
  belowThreshold: 'Спрощена закупівля', competitiveOrdering: 'Відкриті торги (конкурентний відбір)', 'simple.defense': 'Спрощені торги (оборона)',
  aboveThresholdUA_defense: 'Переговорна процедура (оборона)', competitiveDialogueUA: 'Конкурентний діалог', competitiveDialogueEU: 'Конкурентний діалог (англ.)',
  esco: 'Закупівля енергосервісу', closeFrameworkAgreementUA: 'Укладання рамкової угоди'
};
const CATEGORY = { goods: 'Товари', services: 'Послуги', works: 'Роботи' };

// Центри регіонів України (lon, lat) — для карти
export const UA_REGIONS = {
  'Вінницька': [28.47, 49.23], 'Волинська': [25.33, 50.75], 'Дніпропетровська': [35.04, 48.46], 'Донецька': [37.8, 48.0], 'Житомирська': [28.66, 50.25],
  'Закарпатська': [22.29, 48.62], 'Запорізька': [35.14, 47.84], 'Івано-Франківська': [24.71, 48.92], 'Київська': [30.3, 50.3], 'Кіровоградська': [32.26, 48.51],
  'Луганська': [39.3, 48.57], 'Львівська': [24.03, 49.84], 'Миколаївська': [31.99, 46.97], 'Одеська': [30.73, 46.48], 'Полтавська': [34.55, 49.59],
  'Рівненська': [26.25, 50.62], 'Сумська': [34.8, 50.91], 'Тернопільська': [25.59, 49.55], 'Харківська': [36.23, 49.99], 'Херсонська': [32.62, 46.64],
  'Хмельницька': [26.98, 49.42], 'Черкаська': [32.06, 49.44], 'Чернівецька': [25.94, 48.29], 'Чернігівська': [31.29, 51.49], 'Київ': [30.52, 50.45],
  'Крим': [34.1, 44.95], 'Севастополь': [33.52, 44.6]
};
export function uaRegionKey(region = '', locality = '') {
  const s = `${region} ${locality}`;
  if (/київ/i.test(region) && !/область|обл\./i.test(region)) return 'Київ';
  if (/м\.\s*київ/i.test(s) && !/область/i.test(region)) return 'Київ';
  const hit = Object.keys(UA_REGIONS).find(k => k !== 'Київ' && region.toLowerCase().includes(k.toLowerCase().slice(0, 6)));
  return hit || (/київ/i.test(s) ? 'Київська' : null);
}
// Столиці країн ЄС (lon, lat) і ISO3 → ISO2
export const EU = {
  POL: ['PL', 'Польща', 21.01, 52.23], DEU: ['DE', 'Німеччина', 13.4, 52.52], LTU: ['LT', 'Литва', 25.28, 54.69], LVA: ['LV', 'Латвія', 24.1, 56.95], EST: ['EE', 'Естонія', 24.75, 59.44],
  CZE: ['CZ', 'Чехія', 14.42, 50.08], SVK: ['SK', 'Словаччина', 17.11, 48.15], ROU: ['RO', 'Румунія', 26.1, 44.43], AUT: ['AT', 'Австрія', 16.37, 48.21], NLD: ['NL', 'Нідерланди', 4.9, 52.37],
  HUN: ['HU', 'Угорщина', 19.04, 47.5], BGR: ['BG', 'Болгарія', 23.32, 42.7], SVN: ['SI', 'Словенія', 14.51, 46.06], HRV: ['HR', 'Хорватія', 15.98, 45.81], FRA: ['FR', 'Франція', 2.35, 48.86],
  ITA: ['IT', 'Італія', 12.5, 41.9], ESP: ['ES', 'Іспанія', -3.7, 40.42], BEL: ['BE', 'Бельгія', 4.35, 50.85], SWE: ['SE', 'Швеція', 18.07, 59.33], FIN: ['FI', 'Фінляндія', 24.94, 60.17],
  DNK: ['DK', 'Данія', 12.57, 55.68], IRL: ['IE', 'Ірландія', -6.26, 53.35], PRT: ['PT', 'Португалія', -9.14, 38.72], GRC: ['GR', 'Греція', 23.73, 37.98], LUX: ['LU', 'Люксембург', 6.13, 49.61]
};

/* ─────────────── HTTP ─────────────── */
async function http(url, opts = {}, tries = 3) {
  for (let i = 1; ; i++) {
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), opts.timeout || 30000);
    try {
      const r = await fetch(url, { ...opts, signal: ctrl.signal, headers: { 'User-Agent': 'TenderaBot/1.0 (+https://github.com)', Accept: 'application/json', ...(opts.headers || {}) } });
      if (r.status === 429 || r.status >= 500) throw Object.assign(new Error(`HTTP ${r.status}`), { retry: true, status: r.status });
      if (!r.ok) { const body = await r.text().catch(() => ''); throw Object.assign(new Error(`HTTP ${r.status}: ${body.slice(0, 300)}`), { status: r.status }); }
      return await r.json();
    } catch (e) {
      if (i >= tries || (e.status && !e.retry)) throw e;
      await new Promise(res => setTimeout(res, 800 * i * i));
    } finally { clearTimeout(t); }
  }
}
async function pool(items, n, fn) {
  const out = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length && timeLeft() > 60000) { const k = i++; out[k] = await fn(items[k], k).catch(e => ({ __error: e.message })); } }));
  return out;
}

/* ─────────────── Курси НБУ ─────────────── */
export function ratesFromNbu(list) {
  const uah = Object.fromEntries((list || []).map(r => [r.cc, r.rate]));
  if (!uah.EUR) return null;
  const toEur = { UAH: 1 / uah.EUR, EUR: 1 };
  for (const [cc, rate] of Object.entries(uah)) toEur[cc] = rate / uah.EUR;
  return { uahPerEur: uah.EUR, toEur, date: list[0] && list[0].exchangedate };
}

/* ─────────────── Prozorro ─────────────── */
const clip = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s; };
export function normalizeProzorro(d) {
  if (!d || !d.tenderID) return null;
  const items = d.items || [];
  const cpv = [...new Set(items.map(i => i.classification && i.classification.id).filter(Boolean).map(c => c.slice(0, 8)))];
  const cpvName = (items.find(i => i.classification) || {}).classification?.description || '';
  const pe = d.procuringEntity || {}; const addr = pe.address || {};
  const region = uaRegionKey(addr.region || '', addr.locality || '');
  const lots = (d.lots || []).filter(l => l.status !== 'cancelled' && l.status !== 'unsuccessful');
  const guarantee = d.guarantee && d.guarantee.amount ? d.guarantee : lots.reduce((g, l) => l.guarantee && l.guarantee.amount ? { amount: (g ? g.amount : 0) + l.guarantee.amount, currency: l.guarantee.currency } : g, null);
  const docs = (d.documents || []).filter(x => x.url).filter((x, i, a) => a.findIndex(y => y.title === x.title) === i)
    .filter(x => !/sign\.p7s$/i.test(x.title || '')).slice(0, 6).map(x => ({ t: clip(x.title, 120), u: x.url, f: (x.format || '').split('/').pop() }));
  return {
    id: d.tenderID, src: 'prozorro', cc: 'UA',
    t: clip(d.title, 240), d: clip(d.description || (items[0] && items[0].description) || '', 420),
    b: clip(pe.name, 200), bc: pe.identifier && pe.identifier.id || '', r: region, loc: clip(addr.locality, 60),
    v: d.value && d.value.amount ? Math.round(d.value.amount) : null, cur: (d.value && d.value.currency) || 'UAH', vat: d.value ? !!d.value.valueAddedTaxIncluded : null,
    g: guarantee ? Math.round(guarantee.amount) : null,
    cpv, cpvN: clip(cpvName, 140), cat: CATEGORY[d.mainProcurementCategory] || '',
    pt: UA_TYPES[d.procurementMethodType] || d.procurementMethodType || '', lots: lots.length || 1,
    pub: (d.tenderPeriod && d.tenderPeriod.startDate) || d.date || d.dateCreated || null,
    end: d.tenderPeriod && d.tenderPeriod.endDate || null,
    enq: d.enquiryPeriod && d.enquiryPeriod.endDate || null,
    mod: d.dateModified, docs,
    url: `https://prozorro.gov.ua/tender/${d.tenderID}`
  };
}
async function fetchProzorro(previous, meta) {
  const now = Date.now(); const prev = new Map((previous || []).map(t => [t.id, t]));
  const cand = new Map(); let url = `${UA_API}/tenders?descending=1&limit=1000&opt_fields=status,tenderID,tenderPeriod,procurementMethodType,dateModified`;
  let pages = 0;
  while (url && pages < UA_PAGES && timeLeft() > 9 * 60000) {
    const res = await http(url); pages++;
    const data = res.data || [];
    for (const x of data) {
      if (x.status !== 'active.tendering') continue;
      if (!UA_TYPES[x.procurementMethodType]) continue;
      const end = x.tenderPeriod && Date.parse(x.tenderPeriod.endDate);
      if (!end || end < now + 3600e3) continue;
      if (!cand.has(x.id)) cand.set(x.id, x);
    }
    if (!data.length || !res.next_page || !res.next_page.uri) break;
    url = res.next_page.uri;
  }
  meta.prozorro = { feedPages: pages, candidates: cand.size };
  log(`Prozorro: ${pages} сторінок стрічки, ${cand.size} активних кандидатів`);
  // деталі: беремо з попереднього запуску, якщо тендер не змінювався
  const ids = [...cand.values()];
  const reuse = [], need = [];
  for (const x of ids) { const p = prev.get(x.tenderID); if (p && p.mod === x.dateModified) reuse.push({ ...p, t: clip(p.t, 240), d: clip(p.d, 420), docs: (p.docs || []).slice(0, 6) }); else need.push(x); }
  log(`Prozorro: ${reuse.length} без змін, ${need.length} завантажуємо`);
  const fetched = await pool(need, 8, async x => normalizeProzorro((await http(`${UA_API}/tenders/${x.id}`)).data));
  const errors = fetched.filter(f => f && f.__error).length;
  const all = reuse.concat(fetched.filter(f => f && !f.__error))
    .filter(t => t.end && Date.parse(t.end) > now && (t.v == null || t.v >= UA_MIN_UAH));
  all.sort((a, b) => Date.parse(b.pub || 0) - Date.parse(a.pub || 0));
  meta.prozorro.fetched = fetched.length - errors; meta.prozorro.errors = errors; meta.prozorro.kept = Math.min(all.length, UA_MAX);
  return all.slice(0, UA_MAX);
}

/* ─────────────── TED ─────────────── */
const pickLang = v => {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return pickLang(v[0]);
  if (typeof v === 'object') { const k = ['eng', 'ENG', 'en', 'pol', 'deu'].find(x => v[x] != null) || Object.keys(v)[0]; return pickLang(v[k]); }
  return String(v);
};
const first = v => Array.isArray(v) ? v[0] : v;
export function normalizeTed(n, iso3) {
  const pn = n['publication-number']; if (!pn) return null;
  const c = EU[iso3] || EU[first(n['buyer-country'])] || null;
  let title = pickLang(n['notice-title']);
  const parts = title.split(/\s[–-]\s/); if (parts.length >= 3) title = parts.slice(2).join(' – ');
  const cpv = [...new Set([].concat(n['classification-cpv'] || []).map(String).map(x => x.slice(0, 8)))];
  const dl = [].concat(n['deadline-receipt-tender-date-lot'] || n['deadline'] || []).filter(Boolean).sort()[0] || null;
  const val = first(n['total-value'] ?? n['estimated-value-glo'] ?? n['estimated-value-lot']);
  const cur = first(n['total-value-cur'] ?? n['estimated-value-cur-glo'] ?? n['estimated-value-cur-lot']) || 'EUR';
  const toIso = s => { if (!s) return null; const m = String(s).match(/^(\d{4}-\d{2}-\d{2})(T[\d:.]+)?/); return m ? `${m[1]}${m[2] || 'T23:59:00'}Z` : null; };
  return {
    id: String(pn), src: 'ted', cc: c ? c[0] : '', cn: c ? c[1] : '',
    t: clip(title, 260), d: clip(pickLang(n['description-glo'] || n['description-lot'] || ''), 600),
    b: clip(pickLang(n['buyer-name']), 200), bc: '', r: null, loc: clip(pickLang(n['buyer-city'] || ''), 60),
    v: val != null && !isNaN(+val) ? Math.round(+val) : null, cur: String(cur).toUpperCase(), vat: null, g: null,
    cpv, cpvN: '', cat: ({ works: 'Роботи', services: 'Послуги', supplies: 'Товари' })[first(n['contract-nature'])] || '',
    pt: clip(first(n['procedure-type']) || '', 60), lots: 1,
    pub: toIso(first(n['publication-date'])), end: toIso(dl), enq: null, mod: null, docs: [],
    url: `https://ted.europa.eu/en/notice/-/detail/${pn}`
  };
}
async function tedSearch(body) { return http(TED_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), timeout: 45000 }); }
const TED_FIELDS_FULL = ['publication-number', 'notice-title', 'buyer-name', 'buyer-country', 'buyer-city', 'classification-cpv', 'deadline-receipt-tender-date-lot', 'publication-date', 'contract-nature', 'total-value', 'total-value-cur', 'procedure-type'];
const TED_FIELDS_MIN = ['publication-number', 'notice-title', 'buyer-name', 'buyer-country', 'classification-cpv', 'deadline-receipt-tender-date-lot', 'publication-date'];
const TED_VARIANTS = [
  { fields: TED_FIELDS_FULL, extra: { paginationMode: 'PAGE_NUMBER', onlyLatestVersions: true }, typeFilter: true },
  { fields: TED_FIELDS_MIN, extra: { paginationMode: 'PAGE_NUMBER', onlyLatestVersions: true }, typeFilter: true },
  { fields: TED_FIELDS_MIN, extra: {}, typeFilter: true },
  { fields: TED_FIELDS_MIN, extra: {}, typeFilter: false }
];
async function fetchTed(meta) {
  const out = new Map(); const errs = []; let vi = 0;
  const from = new Date(Date.now() - TED_DAYS * 864e5).toISOString().slice(0, 10).replace(/-/g, '');
  for (const iso3 of Object.keys(EU)) {
    if (timeLeft() < 3 * 60000) break;
    for (let page = 1; page <= TED_PAGES; page++) {
      const V = TED_VARIANTS[vi];
      const q = `buyer-country=${iso3}${V.typeFilter ? ' AND notice-type=cn-standard' : ''} AND publication-date>=${from} SORT BY publication-date DESC`;
      let res;
      try { res = await tedSearch({ query: q, fields: V.fields, limit: 100, page, scope: 'ACTIVE', ...V.extra }); }
      catch (e) {
        if (e.status === 400 && vi < TED_VARIANTS.length - 1) { errs.push(`variant ${vi}: ${e.message.slice(0, 200)}`); vi++; page--; continue; }
        errs.push(`${iso3}: ${e.message.slice(0, 200)}`); break;
      }
      const list = res.notices || res.results || res.data || [];
      for (const n of list) {
        if (!V.typeFilter && n['notice-type'] && !/^cn-/.test(first(n['notice-type']))) continue;
        const t = normalizeTed(n, iso3); if (t && t.end && Date.parse(t.end) > Date.now()) out.set(t.id, t);
      }
      if (list.length < 100) break;
      await new Promise(r => setTimeout(r, 350));
    }
  }
  meta.ted = { countries: Object.keys(EU).length, kept: out.size, variant: vi, errors: errs.slice(0, 12) };
  log(`TED: ${out.size} відкритих повідомлень (варіант запиту ${vi})${errs.length ? `, помилок: ${errs.length}` : ''}`);
  return [...out.values()].sort((a, b) => Date.parse(b.pub || 0) - Date.parse(a.pub || 0));
}

/* ─────────────── main ─────────────── */
async function readPrevious(file) {
  try { return JSON.parse(await fs.readFile(path.join(OUT, file), 'utf8')).items; } catch { /* no local copy */ }
  if (!SITE) return [];
  try { const j = await http(SITE + 'data/' + file, {}, 2); return j.items || []; } catch { return []; }
}
export async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const meta = { generatedAt: new Date().toISOString(), sources: [] };
  let rates = null;
  try { rates = ratesFromNbu(await http(NBU_API)); } catch (e) { log('НБУ недоступний:', e.message); }
  if (!rates) { try { rates = JSON.parse(await fs.readFile(path.join(OUT, 'meta.json'), 'utf8')).rates; } catch { rates = null; } }
  meta.rates = rates;

  const prevUa = await readPrevious('tenders-ua.json');
  let ua = null, eu = null;
  try { ua = await fetchProzorro(prevUa, meta); meta.sources.push('prozorro'); } catch (e) { log('Prozorro помилка:', e.message); meta.prozorro = { error: e.message.slice(0, 300) }; ua = prevUa.filter(t => Date.parse(t.end) > Date.now()); }
  try { eu = await fetchTed(meta); meta.sources.push('ted'); } catch (e) { log('TED помилка:', e.message); meta.ted = { error: e.message.slice(0, 300) }; }
  if (!eu || !eu.length) { const prevEu = await readPrevious('tenders-eu.json'); if (prevEu.length) { eu = prevEu.filter(t => Date.parse(t.end) > Date.now()); meta.ted = { ...(meta.ted || {}), reusedPrevious: eu.length }; } else eu = eu || []; }

  meta.counts = { ua: ua.length, eu: eu.length };
  const eurOf = t => t.v == null ? 0 : (rates && rates.toEur[t.cur] ? t.v * rates.toEur[t.cur] : (t.cur === 'EUR' ? t.v : 0));
  meta.totalEur = Math.round(ua.concat(eu).reduce((a, t) => a + eurOf(t), 0));
  await fs.writeFile(path.join(OUT, 'tenders-ua.json'), JSON.stringify({ generatedAt: meta.generatedAt, items: ua }));
  await fs.writeFile(path.join(OUT, 'tenders-eu.json'), JSON.stringify({ generatedAt: meta.generatedAt, items: eu }));
  await fs.writeFile(path.join(OUT, 'meta.json'), JSON.stringify(meta, null, 1));
  // Легкий підсумок для лендінгу: останні оголошення і точки для карти
  const slim = t => ({ id: t.id, src: t.src, cc: t.cc, cn: t.cn, t: t.t, b: t.b, d: t.src === 'prozorro' ? clip(t.d, 200) : '', v: t.v, cur: t.cur, end: t.end, pub: t.pub, url: t.url, docs: (t.docs || []).length, r: t.r });
  const all = ua.concat(eu).filter(t => t.pub);
  const latest = [...all].sort((a, b) => Date.parse(b.pub) - Date.parse(a.pub)).slice(0, 40).map(slim);
  const heroPool = ua.filter(t => t.v && t.d && t.end && Date.parse(t.end) - Date.now() > 5 * 864e5).sort((a, b) => Date.parse(b.pub || 0) - Date.parse(a.pub || 0)).slice(0, 60).sort((a, b) => eurOf(b) - eurOf(a)).slice(0, 5).map(slim);
  const pins = ua.concat(eu).slice(0, 2500).map(t => t.src === 'prozorro' ? ['u', t.r || ''] : ['e', t.cc]);
  await fs.writeFile(path.join(OUT, 'summary.json'), JSON.stringify({ generatedAt: meta.generatedAt, counts: meta.counts, totalEur: meta.totalEur, uahPerEur: rates ? rates.uahPerEur : null, toEur: rates ? { UAH: rates.toEur.UAH, PLN: rates.toEur.PLN, CZK: rates.toEur.CZK, RON: rates.toEur.RON, HUF: rates.toEur.HUF, USD: rates.toEur.USD, GBP: rates.toEur.GBP, SEK: rates.toEur.SEK, DKK: rates.toEur.DKK } : null, latest, hero: heroPool, pins }));
  log(`Готово: UA ${ua.length}, ЄС ${eu.length}, сума ≈ €${meta.totalEur.toLocaleString('en')}`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(e => { console.error(e); process.exit(1); });

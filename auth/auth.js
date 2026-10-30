/* Tendera — реєстрація компанії, вхід, відновлення пароля */
(() => {
  'use strict';
  const { client, configured, siteRoot, humanError } = window.tenderaAuth;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const card = $('#card'), sw = $('#switch');
  const APP = siteRoot() + 'app/';
  const params = new URLSearchParams(location.search);
  document.addEventListener('error', e => { if (e.target.tagName === 'IMG') e.target.classList.add('is-broken'); }, true);

  /* ---------- довідники ---------- */
  const COUNTRIES = [
    ['UA', 'Україна', 'Код ЄДРПОУ', '8 цифр'], ['PL', 'Польща', 'NIP', '10 цифр'], ['DE', 'Німеччина', 'USt-IdNr. (VAT)', 'DE + 9 цифр'],
    ['LT', 'Литва', 'Įmonės kodas', '9 цифр'], ['LV', 'Латвія', 'Reģistrācijas Nr.', '11 цифр'], ['EE', 'Естонія', 'Registrikood', '8 цифр'],
    ['CZ', 'Чехія', 'IČO', '8 цифр'], ['SK', 'Словаччина', 'IČO', '8 цифр'], ['RO', 'Румунія', 'CUI', '2–10 цифр'],
    ['MD', 'Молдова', 'IDNO', '13 цифр'], ['AT', 'Австрія', 'UID (VAT)', 'ATU + 8 цифр'], ['NL', 'Нідерланди', 'KvK', '8 цифр'], ['XX', 'Інша країна', 'Реєстраційний номер', '']
  ];
  const INDUSTRIES = ['Будівництво й ремонт', 'Енергетика', 'Дороги й мости', 'Водопостачання', 'IT і програмне забезпечення', 'Кібербезпека', 'Медичне обладнання', 'Обладнання й техніка', 'Транспорт і логістика', 'Консалтинг і аудит', 'Обслуговування будівель', 'Постачання товарів'];
  const REGIONS = [['UA', 'Україна'], ['PL', 'Польща'], ['EU', 'Увесь ЄС (TED)'], ['DONOR', 'Донорські програми']];
  const FREE_MAIL = /@(gmail|ukr|i\.ua|meta\.ua|yahoo|outlook|hotmail|icloud|proton|protonmail|mail|yandex)\./i;

  /* ---------- валідація ---------- */
  function edrpouOk(code) {
    if (!/^\d{8}$/.test(code)) return false;
    const d = code.split('').map(Number), n = +code;
    const base = (n < 30000000 || n > 60000000) ? [1, 2, 3, 4, 5, 6, 7] : [7, 1, 2, 3, 4, 5, 6];
    let s = base.reduce((a, w, i) => a + w * d[i], 0) % 11;
    if (s >= 10) { s = base.map(w => w + 2).reduce((a, w, i) => a + w * d[i], 0) % 11; if (s >= 10) s = 0; }
    return s === d[7];
  }
  function nipOk(code) {
    if (!/^\d{10}$/.test(code)) return false;
    const w = [6, 5, 7, 2, 3, 4, 5, 6, 7], d = code.split('').map(Number);
    const s = w.reduce((a, x, i) => a + x * d[i], 0) % 11;
    return s !== 10 && s === d[9];
  }
  function regCodeError(country, raw) {
    const code = raw.replace(/[\s-]/g, '').toUpperCase();
    if (!code) return 'Вкажіть код компанії.';
    if (country === 'UA') return /^\d{8}$/.test(code) ? (edrpouOk(code) ? '' : 'Код ЄДРПОУ не проходить перевірку. Перевірте цифри.') : 'Код ЄДРПОУ має 8 цифр.';
    if (country === 'PL') return /^(PL)?\d{10}$/.test(code) ? (nipOk(code.replace(/^PL/, '')) ? '' : 'NIP не проходить перевірку контрольної суми.') : 'NIP має 10 цифр.';
    return code.length >= 4 && code.length <= 20 ? '' : 'Перевірте реєстраційний номер.';
  }
  function strength(pw) {
    let s = 0; if (pw.length >= 8) s++; if (pw.length >= 12) s++; if (/[A-ZА-ЯІЇЄҐ]/.test(pw) && /[a-zа-яіїєґ]/.test(pw)) s++; if (/\d/.test(pw) && /[^\w\s]/.test(pw)) s++;
    return Math.min(4, Math.max(pw ? 1 : 0, s));
  }
  const emailOk = e => /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(e.trim());

  function setErr(f, msg) {
    const box = f.closest('.f'); if (!box) return;
    box.classList.toggle('invalid', !!msg);
    let el = $('.err', box);
    if (msg) { if (!el) { el = document.createElement('span'); el.className = 'err'; el.id = f.id + '-err'; box.append(el); } el.textContent = msg; f.setAttribute('aria-invalid', 'true'); f.setAttribute('aria-describedby', el.id); }
    else { el?.remove(); f.removeAttribute('aria-invalid'); f.removeAttribute('aria-describedby'); }
    return !msg;
  }
  function busy(btn, on, label) {
    if (on) { btn.dataset.label = btn.innerHTML; btn.disabled = true; btn.innerHTML = `<span class="spin" aria-hidden="true"></span>${label || 'Зачекайте…'}`; }
    else { btn.disabled = false; if (btn.dataset.label) btn.innerHTML = btn.dataset.label; }
  }
  function alertBox(kind, html) { return `<div class="alert alert--${kind}" role="${kind === 'bad' ? 'alert' : 'status'}">${html}</div>`; }
  const notConfigured = () => configured ? '' : alertBox('info', 'Реєстрація відкривається найближчим часом. Поки що можна подивитись <a href="../app/?demo=1" style="color:inherit">демо застосунку</a>.');
  function draw(html) { card.innerHTML = html; card.classList.remove('card-in'); void card.offsetWidth; card.classList.add('card-in'); const first = $('input:not([type=hidden]),select', card); if (first && matchMedia('(min-width: 981px)').matches) first.focus(); }
  function topSwitch(mode) {
    sw.innerHTML = mode === 'signup' ? 'Вже маєте акаунт?<a href="?mode=login">Увійти</a>' : mode === 'login' ? 'Ще немає акаунта?<a href="?mode=signup">Зареєструвати компанію</a>' : '<a href="?mode=login">Повернутись до входу</a>';
  }
  function go(mode, extra = '') { history.pushState(null, '', '?mode=' + mode + extra); route(); }
  document.addEventListener('click', e => { const a = e.target.closest('a[href^="?mode="]'); if (a) { e.preventDefault(); history.pushState(null, '', a.getAttribute('href')); route(); } });
  addEventListener('popstate', route);

  /* ---------- РЕЄСТРАЦІЯ ---------- */
  const SU = { step: 1, full_name: '', email: params.get('email') || '', password: '', company_name: params.get('company_name') || '', country: 'UA', reg_code: params.get('company') && /^\d+$/.test(params.get('company')) ? params.get('company') : '', website: params.get('company') && !/^\d+$/.test(params.get('company') || '') ? params.get('company') : '', company_size: '', industries: [], regions: ['UA'], job_title: '', terms: false, marketing: false };
  if (params.get('plan')) SU.plan = params.get('plan');

  function signup() {
    topSwitch('signup'); document.title = 'Реєстрація компанії — Tendera';
    const steps = `<ol class="steps"><li class="on">Акаунт</li><li class="${SU.step >= 2 ? 'on' : ''}">Компанія</li><li class="${SU.step >= 3 ? 'on' : ''}">Напрями</li></ol>`;
    if (SU.step === 1) {
      draw(`${steps}<h1>Зареєструйте компанію</h1><p class="sub">14 днів безкоштовно. Картка не потрібна.</p>${notConfigured()}
      <form id="f" novalidate>
        <div class="f"><label for="full_name">Ім’я та прізвище</label><input id="full_name" autocomplete="name" value="${esc(SU.full_name)}" required></div>
        <div class="f"><label for="email">Робочий email</label><input id="email" type="email" autocomplete="email" inputmode="email" value="${esc(SU.email)}" required><span class="hint" id="emailHint">На нього прийде лист для підтвердження.</span></div>
        <div class="f"><label for="password">Пароль</label><div class="pw"><input id="password" type="password" autocomplete="new-password" minlength="8" value="${esc(SU.password)}" required><button type="button" data-toggle="password" aria-label="Показати пароль">Показати</button></div>
          <div class="meter" id="meter" data-s="${strength(SU.password)}" aria-hidden="true"><i></i><i></i><i></i><i></i></div><span class="hint">Щонайменше 8 символів, з літерами й цифрами.</span></div>
        <div class="actions"><button class="btn btn--primary" type="submit">Далі: компанія</button></div>
      </form>`);
      const f = $('#f');
      $('#password').addEventListener('input', e => { $('#meter').dataset.s = strength(e.target.value); });
      $('#email').addEventListener('blur', e => { $('#emailHint').textContent = FREE_MAIL.test(e.target.value) ? 'Краще використати корпоративну пошту — так колегам буде простіше приєднатись.' : 'На нього прийде лист для підтвердження.'; });
      f.onsubmit = e => {
        e.preventDefault();
        SU.full_name = $('#full_name').value.trim(); SU.email = $('#email').value.trim(); SU.password = $('#password').value;
        const ok = [setErr($('#full_name'), SU.full_name.length < 2 ? 'Вкажіть ім’я та прізвище.' : ''),
          setErr($('#email'), emailOk(SU.email) ? '' : 'Перевірте адресу email.'),
          setErr($('#password'), SU.password.length < 8 ? 'Мінімум 8 символів.' : !(/\d/.test(SU.password) && /\D/.test(SU.password)) ? 'Додайте і літери, і цифри.' : '')].every(Boolean);
        if (!ok) { $('[aria-invalid="true"]', f)?.focus(); return; }
        SU.step = 2; signup();
      };
    } else if (SU.step === 2) {
      const c = COUNTRIES.find(x => x[0] === SU.country) || COUNTRIES[0];
      draw(`${steps}<h1>Про компанію</h1><p class="sub">За кодом ми автоматично заповнимо профіль з відкритих реєстрів.</p>
      <form id="f" novalidate>
        <div class="f"><label for="company_name">Назва компанії</label><input id="company_name" autocomplete="organization" value="${esc(SU.company_name)}" placeholder="ТОВ «Назва»" required></div>
        <div class="row">
          <div class="f"><label for="country">Країна реєстрації</label><select id="country">${COUNTRIES.map(x => `<option value="${x[0]}"${x[0] === SU.country ? ' selected' : ''}>${x[1]}</option>`).join('')}</select></div>
          <div class="f"><label for="reg_code" id="regLbl">${c[2]}</label><input id="reg_code" inputmode="${['UA', 'PL', 'LT', 'EE', 'CZ', 'SK', 'NL', 'MD', 'LV'].includes(SU.country) ? 'numeric' : 'text'}" value="${esc(SU.reg_code)}" placeholder="${c[3]}" required></div>
        </div>
        <div class="row">
          <div class="f"><label for="company_size">Кількість працівників</label><select id="company_size" required><option value="">Оберіть</option>${['1-10', '11-50', '51-250', '251-1000', '1000+'].map(s => `<option${s === SU.company_size ? ' selected' : ''}>${s}</option>`).join('')}</select></div>
          <div class="f"><label for="job_title">Ваша посада</label><input id="job_title" autocomplete="organization-title" value="${esc(SU.job_title)}" placeholder="Директор, тендерний менеджер…"></div>
        </div>
        <div class="f"><label for="website">Сайт компанії <span class="hint">(необов’язково)</span></label><input id="website" type="url" inputmode="url" autocomplete="url" value="${esc(SU.website)}" placeholder="https://"></div>
        <div class="actions"><button class="btn btn--ghost" type="button" id="back">Назад</button><button class="btn btn--primary" type="submit">Далі: напрями</button></div>
      </form>`);
      $('#country').onchange = e => { SU.country = e.target.value; const x = COUNTRIES.find(y => y[0] === SU.country); $('#regLbl').textContent = x[2]; $('#reg_code').placeholder = x[3]; setErr($('#reg_code'), ''); };
      $('#back').onclick = () => { collect2(); SU.step = 1; signup(); };
      $('#f').onsubmit = e => {
        e.preventDefault(); collect2();
        const ok = [setErr($('#company_name'), SU.company_name.length < 2 ? 'Вкажіть назву компанії.' : ''),
          setErr($('#reg_code'), regCodeError(SU.country, SU.reg_code)),
          setErr($('#company_size'), SU.company_size ? '' : 'Оберіть розмір компанії.')].every(Boolean);
        if (!ok) { $('[aria-invalid="true"]')?.focus(); return; }
        SU.step = 3; signup();
      };
    } else {
      draw(`${steps}<h1>Які тендери шукаємо?</h1><p class="sub">Від цього залежить ваш ранковий відбір. Змінити можна будь-коли.</p>
      <form id="f" novalidate>
        <fieldset class="f" style="border:0;padding:0;margin:0"><legend class="lbl" style="margin-bottom:8px">Напрями діяльності</legend><div class="chips" id="ind">${INDUSTRIES.map(i => `<label><input type="checkbox" value="${esc(i)}"${SU.industries.includes(i) ? ' checked' : ''}><span>${esc(i)}</span></label>`).join('')}</div></fieldset>
        <fieldset class="f" style="border:0;padding:0;margin:0"><legend class="lbl" style="margin-bottom:8px">Де шукати</legend><div class="chips" id="reg">${REGIONS.map(([k, n]) => `<label><input type="checkbox" value="${k}"${SU.regions.includes(k) ? ' checked' : ''}><span>${n}</span></label>`).join('')}</div></fieldset>
        <label class="check"><input type="checkbox" id="terms"${SU.terms ? ' checked' : ''} required><span>Погоджуюсь з <a href="../legal/terms.html" target="_blank" rel="noopener">умовами використання</a> і <a href="../legal/privacy.html" target="_blank" rel="noopener">політикою конфіденційності</a>.</span></label>
        <label class="check"><input type="checkbox" id="marketing"${SU.marketing ? ' checked' : ''}><span>Надсилати новини продукту й аналітику ринку тендерів (не частіше разу на місяць).</span></label>
        <div id="msg"></div>
        <div class="actions"><button class="btn btn--ghost" type="button" id="back">Назад</button><button class="btn btn--primary" type="submit" id="go"${configured ? '' : ' disabled'}>Створити акаунт</button></div>
      </form>`);
      const collect3 = () => { SU.industries = $$('#ind input:checked').map(i => i.value); SU.regions = $$('#reg input:checked').map(i => i.value); SU.terms = $('#terms').checked; SU.marketing = $('#marketing').checked; };
      $('#back').onclick = () => { collect3(); SU.step = 2; signup(); };
      $('#f').onsubmit = async e => {
        e.preventDefault(); collect3(); const msg = $('#msg');
        if (!SU.industries.length) { msg.innerHTML = alertBox('bad', 'Оберіть хоча б один напрям.'); return; }
        if (!SU.terms) { msg.innerHTML = alertBox('bad', 'Щоб продовжити, погодьтесь з умовами і політикою конфіденційності.'); $('#terms').focus(); return; }
        if (!configured) return;
        const btn = $('#go'); busy(btn, true, 'Створюємо акаунт…'); msg.innerHTML = '';
        try {
          const { data, error } = await client.auth.signUp({
            email: SU.email, password: SU.password,
            options: {
              emailRedirectTo: APP + '?welcome=1',
              data: { full_name: SU.full_name, job_title: SU.job_title, company_name: SU.company_name, country: SU.country, reg_code: SU.reg_code.replace(/[\s-]/g, '').toUpperCase(), company_size: SU.company_size, website: SU.website, industries: SU.industries, regions: SU.regions, marketing_opt_in: SU.marketing, locale: 'uk', plan_intent: SU.plan || 'pro' }
            }
          });
          if (error) throw error;
          if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) throw new Error('User already registered');
          if (data.session) { location.href = APP + '?welcome=1'; return; }
          checkEmail(SU.email);
        } catch (err) { msg.innerHTML = alertBox('bad', esc(humanError(err))); busy(btn, false); }
      };
    }
    function collect2() { SU.company_name = $('#company_name').value.trim(); SU.country = $('#country').value; SU.reg_code = $('#reg_code').value.trim(); SU.company_size = $('#company_size').value; SU.job_title = $('#job_title').value.trim(); SU.website = $('#website').value.trim(); }
  }

  function checkEmail(email) {
    sw.innerHTML = '';
    draw(`<div class="done"><div class="done__icon"><svg viewBox="0 0 24 24"><path d="M3 7l9 6 9-6"/><rect x="3" y="5" width="18" height="14" rx="2"/></svg></div>
      <h1>Перевірте пошту</h1><p class="sub">Ми надіслали лист на <b>${esc(email)}</b>. Натисніть посилання в ньому — і ваш робочий простір відкриється.</p>
      <div id="msg"></div>
      <div style="display:grid;gap:10px;margin-top:8px"><button class="btn btn--ghost" type="button" id="resend">Надіслати лист ще раз</button><a class="link" href="?mode=login">Уже підтвердили? Увійти</a></div>
      <p class="hint" style="margin-top:20px">Не бачите листа? Перевірте «Спам» або «Промоакції». Лист приходить від Supabase Auth.</p></div>`);
    let wait = 0;
    $('#resend').onclick = async e => {
      if (wait > Date.now()) return; const btn = e.currentTarget; busy(btn, true, 'Надсилаємо…');
      try { const { error } = await client.auth.resend({ type: 'signup', email, options: { emailRedirectTo: APP + '?welcome=1' } }); if (error) throw error; $('#msg').innerHTML = alertBox('ok', 'Лист надіслано ще раз.'); wait = Date.now() + 60000; }
      catch (err) { $('#msg').innerHTML = alertBox('bad', esc(humanError(err))); }
      busy(btn, false);
    };
  }

  /* ---------- ВХІД ---------- */
  function login() {
    topSwitch('login'); document.title = 'Вхід — Tendera';
    const reason = params.get('reason') === 'session' ? alertBox('info', 'Увійдіть, щоб відкрити робочий простір компанії.') : '';
    draw(`<h1>З поверненням</h1><p class="sub">Увійдіть у робочий простір вашої компанії.</p>${reason}${notConfigured()}
    <form id="f" novalidate>
      <div class="f"><label for="email">Email</label><input id="email" type="email" autocomplete="username" inputmode="email" value="${esc(params.get('email') || '')}" required></div>
      <div class="f"><div class="split"><label for="password">Пароль</label><a class="link" href="?mode=reset">Забули пароль?</a></div><div class="pw"><input id="password" type="password" autocomplete="current-password" required><button type="button" data-toggle="password" aria-label="Показати пароль">Показати</button></div></div>
      <div id="msg"></div>
      <button class="btn btn--primary" type="submit" id="go"${configured ? '' : ' disabled'}>Увійти</button>
      <div class="or">або</div>
      <button class="btn btn--ghost" type="button" id="magic"${configured ? '' : ' disabled'}>Надіслати посилання для входу на email</button>
    </form>`);
    $('#f').onsubmit = async e => {
      e.preventDefault(); const email = $('#email').value.trim(), password = $('#password').value, msg = $('#msg');
      if (!setErr($('#email'), emailOk(email) ? '' : 'Перевірте адресу email.') || !setErr($('#password'), password ? '' : 'Введіть пароль.')) return;
      const btn = $('#go'); busy(btn, true, 'Входимо…'); msg.innerHTML = '';
      try { const { error } = await client.auth.signInWithPassword({ email, password }); if (error) throw error; location.href = params.get('next') && params.get('next').startsWith('#/') ? APP + params.get('next') : APP; }
      catch (err) { msg.innerHTML = alertBox('bad', esc(humanError(err))); busy(btn, false); }
    };
    $('#magic').onclick = async e => {
      const email = $('#email').value.trim(), msg = $('#msg');
      if (!setErr($('#email'), emailOk(email) ? '' : 'Вкажіть email, на який надіслати посилання.')) { $('#email').focus(); return; }
      const btn = e.currentTarget; busy(btn, true, 'Надсилаємо…');
      try { const { error } = await client.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: APP } }); if (error) throw error; msg.innerHTML = alertBox('ok', `Посилання для входу надіслано на ${esc(email)}.`); }
      catch (err) { msg.innerHTML = alertBox('bad', /signups not allowed|not found/i.test(err.message || '') ? 'Акаунта з таким email немає. Зареєструйте компанію.' : esc(humanError(err))); }
      busy(btn, false);
    };
  }

  /* ---------- ВІДНОВЛЕННЯ ПАРОЛЯ ---------- */
  function reset() {
    topSwitch('reset'); document.title = 'Відновлення пароля — Tendera';
    draw(`<h1>Відновлення пароля</h1><p class="sub">Надішлемо посилання, за яким можна задати новий пароль.</p>${notConfigured()}
    <form id="f" novalidate><div class="f"><label for="email">Email акаунта</label><input id="email" type="email" autocomplete="email" inputmode="email" required></div><div id="msg"></div>
    <button class="btn btn--primary" type="submit" id="go"${configured ? '' : ' disabled'}>Надіслати посилання</button></form>`);
    $('#f').onsubmit = async e => {
      e.preventDefault(); const email = $('#email').value.trim(), msg = $('#msg');
      if (!setErr($('#email'), emailOk(email) ? '' : 'Перевірте адресу email.')) return;
      const btn = $('#go'); busy(btn, true, 'Надсилаємо…');
      try { const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: siteRoot() + 'auth/?mode=update' }); if (error) throw error;
        msg.innerHTML = alertBox('ok', `Якщо акаунт з адресою ${esc(email)} існує, лист із посиланням уже в дорозі.`); }
      catch (err) { msg.innerHTML = alertBox('bad', esc(humanError(err))); }
      busy(btn, false);
    };
  }

  /* ---------- НОВИЙ ПАРОЛЬ ---------- */
  async function update() {
    topSwitch('update'); document.title = 'Новий пароль — Tendera';
    const { data } = configured ? await client.auth.getSession() : { data: {} };
    if (!data.session) { draw(`<h1>Посилання недійсне</h1><p class="sub">Можливо, воно застаріло або вже використане.</p><a class="btn btn--primary" href="?mode=reset" style="width:100%">Запросити нове посилання</a>`); return; }
    draw(`<h1>Новий пароль</h1><p class="sub">Для акаунта ${esc(data.session.user.email)}.</p>
    <form id="f" novalidate><div class="f"><label for="password">Новий пароль</label><div class="pw"><input id="password" type="password" autocomplete="new-password" minlength="8" required><button type="button" data-toggle="password" aria-label="Показати пароль">Показати</button></div><div class="meter" id="meter" data-s="0" aria-hidden="true"><i></i><i></i><i></i><i></i></div></div>
    <div id="msg"></div><button class="btn btn--primary" type="submit" id="go">Зберегти і увійти</button></form>`);
    $('#password').addEventListener('input', e => { $('#meter').dataset.s = strength(e.target.value); });
    $('#f').onsubmit = async e => {
      e.preventDefault(); const pw = $('#password').value;
      if (!setErr($('#password'), pw.length < 8 ? 'Мінімум 8 символів.' : '')) return;
      const btn = $('#go'); busy(btn, true, 'Зберігаємо…');
      try { const { error } = await client.auth.updateUser({ password: pw }); if (error) throw error; location.href = APP; }
      catch (err) { $('#msg').innerHTML = alertBox('bad', esc(humanError(err))); busy(btn, false); }
    };
  }

  /* ---------- спільне ---------- */
  card.addEventListener('click', e => {
    const t = e.target.closest('[data-toggle]'); if (!t) return;
    const i = $('#' + t.dataset.toggle); const show = i.type === 'password';
    i.type = show ? 'text' : 'password'; t.textContent = show ? 'Сховати' : 'Показати'; t.setAttribute('aria-label', show ? 'Сховати пароль' : 'Показати пароль');
  });

  async function route() {
    const mode = new URLSearchParams(location.search).get('mode') || 'signup';
    if (configured && (mode === 'signup' || mode === 'login')) {
      const { data } = await client.auth.getSession();
      if (data.session) { location.replace(APP); return; }
    }
    ({ signup, login, reset, update }[mode] || signup)();
  }
  if (configured) client.auth.onAuthStateChange(ev => { if (ev === 'PASSWORD_RECOVERY' && new URLSearchParams(location.search).get('mode') !== 'update') go('update'); });
  route();
})();

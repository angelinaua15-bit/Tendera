/* Tendera — спільний клієнт авторизації (Supabase). Потрібні config.js і vendor/supabase.js. */
(() => {
  'use strict';
  const cfg = window.TENDERA_CONFIG || {};
  const configured = !!(cfg.supabaseUrl && cfg.supabaseKey && window.supabase);
  const client = configured
    ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
        auth: {
          persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce',
          // Без navigator.locks: інакше getSession() може зависнути, якщо інша вкладка тримає блокування
          lock: (name, timeout, fn) => fn()
        }
      })
    : null;

  // Корінь сайту працює і на GitHub Pages (/Tendera/), і локально (/)
  function siteRoot() {
    const p = location.pathname.replace(/\/(auth|app|legal|brand)(\/.*)?$/, '/').replace(/[^/]*$/, '');
    return location.origin + (p.endsWith('/') ? p : p + '/');
  }

  const ERRORS = [
    [/invalid login credentials/i, 'Неправильний email або пароль.'],
    [/email not confirmed/i, 'Спершу підтвердіть email — ми надіслали лист із посиланням.'],
    [/user already registered|already been registered/i, 'Акаунт з таким email уже існує. Увійдіть або відновіть пароль.'],
    [/password should be at least|weak password|password is too weak/i, 'Пароль занадто слабкий: щонайменше 8 символів, літери й цифри.'],
    [/rate limit|too many requests|security purposes/i, 'Забагато спроб. Зачекайте хвилину і спробуйте ще раз.'],
    [/invalid email|unable to validate email/i, 'Перевірте адресу email.'],
    [/signups not allowed|signup is disabled/i, 'Реєстрацію тимчасово закрито.'],
    [/failed to fetch|network/i, 'Немає з’єднання із сервером. Перевірте інтернет і спробуйте ще раз.'],
    [/same password|different from the old/i, 'Новий пароль має відрізнятися від старого.'],
    [/expired|invalid.*(token|link|otp)/i, 'Посилання застаріло. Запросіть нове.']
  ];
  function humanError(e) {
    const msg = (e && (e.message || e.error_description || String(e))) || '';
    if (/failed to fetch|network|load failed/i.test(msg) && navigator.onLine !== false)
      return 'Сервер входу зараз недоступний. Ми вже працюємо над цим — спробуйте трохи пізніше.';
    const hit = ERRORS.find(([re]) => re.test(msg));
    return hit ? hit[1] : 'Не вдалося виконати дію. Спробуйте ще раз або напишіть нам.';
  }

  // Сесія з тайм-аутом: сторінка ніколи не чекає вічно
  async function currentSession(ms = 5000) {
    if (!client) return { session: null, ok: false };
    let timer;
    try {
      const res = await Promise.race([
        client.auth.getSession(),
        new Promise((_, rej) => { timer = setTimeout(() => rej(new Error('timeout')), ms); })
      ]);
      return { session: (res && res.data && res.data.session) || null, ok: !res.error };
    } catch (e) { return { session: null, ok: false, error: e }; }
    finally { clearTimeout(timer); }
  }

  window.tenderaAuth = { client, configured, siteRoot, humanError, currentSession };
})();

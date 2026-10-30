# Tendera

Відкриті державні тендери Prozorro і TED під профіль вашої компанії: оцінка збігу, pipeline, чекліст подачі, нотатки й бібліотека документів для всієї команди.

![Tendera](brand/banner.png)

## Що тут є

| Шлях | Що це |
| --- | --- |
| `/` | Лендінг (UA / EN) з живими даними: кількість і сума відкритих тендерів, останні оголошення на карті |
| `/auth/` | Реєстрація компанії (перевірка ЄДРПОУ / NIP за контрольною сумою), вхід паролем або посиланням, відновлення пароля |
| `/app/` | Робочий простір (лише після входу): стрічка тендерів з оцінкою збігу, сторінка тендера, pipeline, заявка з чеклістом, бібліотека документів, аналітика, команда |
| `/legal/` | Політика конфіденційності та умови використання |
| `/brand/` | Бренд-кит: живий логотип, аватарка, банер |

## Звідки дані

- **Prozorro** — публічний API `public-api.prozorro.gov.ua` (активні торги з відкритим прийомом пропозицій).
- **TED** — пошуковий API `api.ted.europa.eu/v3/notices/search` (повідомлення про закупівлі країн ЄС за останні 3 тижні).
- **НБУ** — офіційні курси валют для перерахунку бюджетів у євро.

Скрипт `scripts/fetch-tenders.mjs` запускається в GitHub Actions щогодини (`.github/workflows/pages.yml`), записує `data/*.json` і публікує сайт на GitHub Pages. Дані в репозиторій не комітяться.

## Налаштування (один раз)

1. **GitHub Pages:** Settings → Pages → Source: **GitHub Actions**.
2. **Supabase → SQL Editor:** запустіть `supabase/schema.sql` (повторний запуск безпечний). Створяться компанії, профілі, команда, стан застосунку, запрошення, документи і приватне сховище файлів з Row Level Security.
3. **Supabase → Authentication → URL Configuration:**
   - Site URL: `https://angelinaua15-bit.github.io/Tendera/`
   - Redirect URLs: `https://angelinaua15-bit.github.io/Tendera/**`
4. `assets/js/config.js` — URL проєкту і **publishable** ключ. Secret / service_role ключ у код не додавайте ніколи.

## Запуск локально

```bash
node scripts/fetch-tenders.mjs   # зібрати свіжі дані в data/
python3 -m http.server 8000      # відкрийте http://localhost:8000
```

## Ресурси та ліцензії

- Шрифти Geist і Cormorant Garamond — SIL Open Font License (`assets/fonts`).
- Карта Європи — точкова матриця з даних Natural Earth (public domain).
- Фото — [Unsplash](https://unsplash.com) (Unsplash License).
- Оцінка ринку $13 трлн — [Open Contracting Partnership і Spend Network](https://www.open-contracting.org/global-procurement-spend).

© 2026 Tendera

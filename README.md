# Tendera

AI-платформа для державних і донорських тендерів у Європі: щоранку знаходить закупівлі, які компанія може виграти, пояснює вимоги за 30 секунд і готує заявку.

![Tendera](brand/banner.png)

## Що тут є

| Шлях | Що це |
| --- | --- |
| `/` | Лендінг (UA / EN): живі фото, анімована карта Європи, AI-бриф, тарифи |
| `/app/` | Демо застосунку: онбординг, огляд, стрічка тендерів, AI-бриф і вердикт, чат з документацією, pipeline з drag & drop, робоче місце заявки з генерацією чернетки, бібліотека документів, аналітика, налаштування, ⌘K-палітра, світла і темна теми |
| `/brand/` | Бренд-кит: живий логотип, знак, аватарка, банер, кольори, шрифти |

Усе статичне (HTML, CSS, vanilla JS), без збірки — відкривається на GitHub Pages як є.

## Запуск локально

```bash
python3 -m http.server 8000
# відкрийте http://localhost:8000
```

## Налаштування

- `assets/js/config.js` — email для заявок на Enterprise-демо.
- `app/data.js` — демо-дані (тендери, бібліотека, команда). Усі тендери, замовники й люди в демо вигадані.

## Ресурси та ліцензії

- Шрифти Geist і Cormorant Garamond — SIL Open Font License, підключені локально (`assets/fonts`).
- Карта Європи — точкова матриця, згенерована з даних Natural Earth (public domain) через `world-atlas`.
- Фото — [Unsplash](https://unsplash.com) (Unsplash License): Enes Gundogdu, Danist Soh, dominik hofbauer, Vitaly Gariev, Scott Graham, Sander Weeteling, Wes Hicks, Christina @ wocintechchat, American Public Power Association.
- Оцінка ринку $13 трлн — [Open Contracting Partnership і Spend Network](https://www.open-contracting.org/global-procurement-spend).

© 2026 Tendera

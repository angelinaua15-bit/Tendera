/* Tendera demo data. Усі тендери, компанії й люди тут — демонстраційні. */
(() => {
  const U = id => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1600&q=80`;
  const PHOTOS = {
    construction: U('1429497419816-9ca5cfb4571a'),
    energy: U('1615209853186-e4bd66602508'),
    wind: U('1508791290064-c27cc1ef7a9a'),
    bridge: U('1529926691761-20fb82067c71'),
    it: U('1573164574572-cb89e39749b4'),
    office: U('1768101225267-c6fc5678c113'),
    city: U('1577450775949-58ec8d02cad9'),
    meeting: U('1758691737182-d42aefd6dee8'),
    signing: U('1450101499163-c8848c66ca85'),
    boardroom: U('1431540015161-0bf868a2d407')
  };
  const COUNTRIES = { UA: 'Україна', PL: 'Польща', DE: 'Німеччина', LT: 'Литва', RO: 'Румунія', CZ: 'Чехія', SK: 'Словаччина', AT: 'Австрія', NL: 'Нідерланди', LV: 'Латвія', EE: 'Естонія' };
  const UAH = 45.2; // демо-курс для відображення гривні

  const T = (o) => Object.assign({ docs: [], risks: [], requirements: [], reasons: [], against: [], winners: [] }, o);
  const TENDERS = [
    T({ id: 'UA-2026-1041', title: 'Реконструкція системи теплопостачання обласної лікарні', buyer: 'Обласна клінічна лікарня (демо)', country: 'UA', city: 'Lviv', cityName: 'Львів', source: 'Prozorro', cpv: '45331000', cpvName: 'Монтаж систем опалення', category: 'construction', value: 1075000, deadline: 16, published: 3, match: 92, verdict: 'bid', bidders: 3, discount: 7.8,
      brief: 'Замовник шукає підрядника для повної заміни котельного обладнання і внутрішніх мереж теплопостачання у двох корпусах лікарні. Роботи виконуються без зупинки роботи закладу, поетапно. Ключова кваліфікація — досвід аналогічного договору за 3 роки і двоє інженерів технагляду. Головний ризик — стислий строк 120 днів.',
      reasons: ['Ваш досвід: 4 аналогічні договори за 3 роки', 'CPV 45331000 у вашому профілі', 'Львівська область — ваш основний регіон'], against: ['Потрібна банківська гарантія 0,5%'],
      requirements: [
        { text: 'Досвід щонайменше одного аналогічного договору за 3 роки', page: 14, clause: '3.1', status: 'ok', doc: 'lib-3' },
        { text: 'Банківська гарантія забезпечення пропозиції 0,5% (₴ 243 000)', page: 14, clause: '3.2', status: 'missing' },
        { text: 'Довідка про матеріально-технічну базу', page: 14, clause: '3.3', status: 'ok', doc: 'lib-5' },
        { text: 'Строк виконання робіт до 120 календарних днів', page: 14, clause: '3.4', status: 'check' },
        { text: '2 працівники з сертифікатами інженера технагляду', page: 14, clause: '3.5', status: 'ok', doc: 'lib-4' },
        { text: 'Ліцензія / дозвіл на виконання робіт підвищеної небезпеки', page: 16, clause: '3.8', status: 'ok', doc: 'lib-2' },
        { text: 'Довідка про відсутність податкової заборгованості', page: 17, clause: '4.2', status: 'check', doc: 'lib-6' },
        { text: 'Кошторис за формою ДСТУ Б Д.1.1-1', page: 22, clause: '5.1', status: 'ok' }
      ],
      risks: [{ level: 'high', text: '120 днів на роботи, що зазвичай тривають 150–180 днів', page: 14 }, { level: 'mid', text: 'Аванс не передбачено, оплата за актами раз на місяць', page: 31 }, { level: 'low', text: 'Штраф 0,1% за кожен день прострочення', page: 33 }],
      docs: [{ name: 'Тендерна документація.pdf', pages: 64 }, { name: 'Проєктно-кошторисна документація.pdf', pages: 118 }, { name: 'Проєкт договору.pdf', pages: 32 }],
      winners: [{ name: 'ТОВ «Теплобуд Захід»', amount: 920000, year: 2025 }, { name: 'ПП «Енергомонтаж»', amount: 1310000, year: 2024 }] }),
    T({ id: 'PL-2026-77812', title: 'Modernizacja oświetlenia ulicznego na technologię LED', titleUa: 'Модернізація вуличного освітлення на LED', buyer: 'Zarząd Dróg Miejskich (demo)', country: 'PL', city: 'Krakow', cityName: 'Краків', source: 'e-Zamówienia', cpv: '45316110', cpvName: 'Монтаж вуличного освітлення', category: 'city', value: 2100000, deadline: 23, published: 8, match: 81, verdict: 'bid', bidders: 5, discount: 11.2,
      brief: 'Заміна 3 400 світильників на LED з системою дистанційного керування в трьох районах міста. Допускається участь консорціуму. Потрібен досвід щонайменше 2 проєктів на 500 000 євро. Мова документації — польська, переклад доступний.',
      reasons: ['Енергоефективність — ваш напрям з 2023 року', 'Допускається консорціум з польським партнером'], against: ['Немає досвіду робіт у Польщі', 'Потрібна реєстрація в JEDZ'],
      requirements: [{ text: 'Два проєкти вартістю від €500 000 за 5 років', page: 9, clause: 'V.1', status: 'check' }, { text: 'Заповнений JEDZ (ESPD)', page: 11, clause: 'VI.2', status: 'missing' }, { text: 'Гарантія виконання 5%', page: 18, clause: 'XII', status: 'missing' }, { text: 'Сертифікати продукції CE', page: 12, clause: 'VI.4', status: 'ok', doc: 'lib-7' }],
      risks: [{ level: 'mid', text: 'Висока конкуренція: у середньому 5 учасників', page: 0 }, { level: 'low', text: 'Гарантія на світильники 7 років', page: 21 }],
      docs: [{ name: 'SWZ.pdf', pages: 48 }, { name: 'OPZ.pdf', pages: 72 }], winners: [{ name: 'Elektro-Bud Sp. z o.o.', amount: 1880000, year: 2025 }] }),
    T({ id: 'UA-2026-1188', title: 'Постачання модульних котелень для закладів освіти', buyer: 'Департамент освіти міської ради (демо)', country: 'UA', city: 'Kyiv', cityName: 'Київ', source: 'Prozorro', cpv: '44621000', cpvName: 'Котли', category: 'energy', value: 3400000, deadline: 11, published: 1, match: 88, verdict: 'bid', bidders: 4, discount: 9.4,
      brief: 'Поставка, монтаж і пусконалагодження 12 модульних котелень потужністю 300–600 кВт для шкіл і садочків. Оплата частинами після введення кожного об’єкта. Потрібен авторизаційний лист виробника.',
      reasons: ['Ви вже постачали котельні у 2024–2025', 'Бюджет у вашому діапазоні'], against: ['Дедлайн через 11 днів'],
      requirements: [{ text: 'Авторизаційний лист виробника обладнання', page: 7, clause: '2.4', status: 'missing' }, { text: 'Сервісний центр в Україні', page: 8, clause: '2.6', status: 'ok' }, { text: 'Досвід поставки аналогічного обладнання', page: 7, clause: '2.1', status: 'ok', doc: 'lib-3' }],
      risks: [{ level: 'mid', text: 'Строк поставки 45 днів після підписання', page: 19 }], docs: [{ name: 'Тендерна документація.pdf', pages: 52 }, { name: 'Технічні вимоги.xlsx', pages: 4 }], winners: [{ name: 'ТОВ «Термо-Систем»', amount: 2950000, year: 2025 }] }),
    T({ id: 'RO-2026-3391', title: 'Reabilitarea podului rutier peste râul Argeș', titleUa: 'Реабілітація автомобільного мосту через річку Арджеш', buyer: 'CNAIR (demo)', country: 'RO', city: 'Bucharest', cityName: 'Бухарест', source: 'TED', cpv: '45221111', cpvName: 'Будівництво мостів', category: 'bridge', value: 5800000, deadline: 34, published: 26, match: 64, verdict: 'consider', bidders: 6, discount: 6.1,
      brief: 'Капітальний ремонт залізобетонного мосту довжиною 240 м із заміною деформаційних швів і гідроізоляції. Фінансування ЄС (CEF). Обов’язкова присутність інженера, атестованого в Румунії.',
      reasons: ['Мостові роботи у вашому профілі', 'Фінансування ЄС, стабільна оплата'], against: ['Потрібен румунський атестований інженер', 'Оборот має бути вище €8 млн'],
      requirements: [{ text: 'Середній річний оборот від €8 млн за 3 роки', page: 21, clause: 'III.1.2', status: 'missing' }, { text: 'Атестований в Румунії інженер-мостовик', page: 23, clause: 'III.1.3', status: 'missing' }],
      risks: [{ level: 'high', text: 'Ваш оборот нижче порогу — тільки в консорціумі', page: 21 }], docs: [{ name: 'Fișa de date.pdf', pages: 88 }], winners: [] }),
    T({ id: 'DE-2026-55120', title: 'IT-Sicherheitsaudit und Penetrationstest für Bezirksamt', titleUa: 'Аудит ІТ-безпеки і пентест для районної адміністрації', buyer: 'Bezirksamt (demo)', country: 'DE', city: 'Berlin', cityName: 'Берлін', source: 'TED', cpv: '72800000', cpvName: 'Аудит і тестування ІТ', category: 'it', value: 480000, deadline: 19, published: 30, match: 57, verdict: 'consider', bidders: 7, discount: 4.2,
      brief: 'Аудит ІТ-інфраструктури за стандартом BSI IT-Grundschutz і пентест 40 зовнішніх сервісів. Звітність німецькою. Потрібні сертифікати ISO 27001 Lead Auditor.',
      reasons: ['Ваш партнер у профілі має ISO 27001'], against: ['Мова звітів — німецька', 'Не ваш основний напрям'],
      requirements: [{ text: 'ISO 27001 Lead Auditor у команді', page: 6, clause: '4.2', status: 'check' }], risks: [{ level: 'mid', text: 'Висока конкуренція, 7 учасників у середньому', page: 0 }], docs: [{ name: 'Leistungsbeschreibung.pdf', pages: 36 }] }),
    T({ id: 'UA-2026-1302', title: 'Відновлення водопровідних мереж, лот 2', buyer: 'КП «Водоканал» (демо)', country: 'UA', city: 'Odesa', cityName: 'Одеса', source: 'Світовий банк', cpv: '45231300', cpvName: 'Водопровідні мережі', category: 'construction', value: 2700000, deadline: 28, published: 12, match: 86, verdict: 'bid', bidders: 3, discount: 8.6,
      brief: 'Заміна 14 км водопровідних мереж у межах проєкту, фінансованого Світовим банком. Процедура RFB, документи англійською. Потрібен досвід за стандартами FIDIC.',
      reasons: ['Ви працювали за FIDIC у 2025', 'Низька конкуренція в донорських процедурах'], against: ['Документи англійською'],
      requirements: [{ text: 'Договір за FIDIC за 5 років', page: 34, clause: 'ITB 4.2', status: 'ok', doc: 'lib-3' }, { text: 'Bid Security $60 000', page: 12, clause: 'ITB 19', status: 'missing' }, { text: 'Анкета сталості та безпеки праці (ESHS)', page: 41, clause: 'Sec. IV', status: 'check' }],
      risks: [{ level: 'mid', text: 'Вимоги ESHS: окремий план з охорони праці', page: 41 }], docs: [{ name: 'Request for Bids.pdf', pages: 210 }], winners: [{ name: 'Joint Venture UA-PL', amount: 2410000, year: 2025 }] }),
    T({ id: 'LT-2026-0907', title: 'Mokyklos stogo ir fasado renovacija', titleUa: 'Реновація даху і фасаду школи', buyer: 'Savivaldybė (demo)', country: 'LT', city: 'Vilnius', cityName: 'Вільнюс', source: 'TED', cpv: '45261000', cpvName: 'Покрівельні роботи', category: 'construction', value: 620000, deadline: 21, published: 40, match: 74, verdict: 'consider', bidders: 4, discount: 9.9,
      brief: 'Заміна покрівлі площею 3 200 м² і утеплення фасаду. Роботи влітку 2027 року. Допускаються субпідрядники.', reasons: ['Покрівельні роботи у профілі'], against: ['Немає литовського партнера'],
      requirements: [{ text: 'Свідоцтво про право виконувати роботи в Литві', page: 5, clause: '3.1', status: 'missing' }], risks: [{ level: 'low', text: 'Роботи лише в період канікул', page: 9 }], docs: [{ name: 'Pirkimo sąlygos.pdf', pages: 29 }] }),
    T({ id: 'UA-2026-1355', title: 'Ремонт школи після пошкоджень, корпус Б', buyer: 'Управління капітального будівництва (демо)', country: 'UA', city: 'Kharkiv', cityName: 'Харків', source: 'Prozorro', cpv: '45453000', cpvName: 'Капітальний ремонт', category: 'construction', value: 1050000, deadline: 9, published: 2, match: 79, verdict: 'bid', bidders: 2, discount: 5.3,
      brief: 'Відновлення покрівлі, вікон і внутрішніх інженерних мереж корпусу школи. Фінансування з фонду ліквідації наслідків збройної агресії.', reasons: ['Досвід відновлення об’єктів освіти'], against: ['Дедлайн через 9 днів'],
      requirements: [{ text: 'Досвід аналогічних робіт', page: 6, clause: '2.1', status: 'ok', doc: 'lib-3' }, { text: 'Гарантійний лист щодо строків', page: 8, clause: '2.5', status: 'check' }], risks: [{ level: 'mid', text: 'Короткий строк на підготовку пропозиції', page: 0 }], docs: [{ name: 'Тендерна документація.pdf', pages: 41 }] }),
    T({ id: 'CZ-2026-2210', title: 'Dodávka zdravotnické techniky pro nemocnici', titleUa: 'Постачання медичного обладнання для лікарні', buyer: 'Fakultní nemocnice (demo)', country: 'CZ', city: 'Prague', cityName: 'Прага', source: 'TED', cpv: '33100000', cpvName: 'Медичне обладнання', category: 'office', value: 940000, deadline: 26, published: 18, match: 38, verdict: 'skip', bidders: 5, discount: 3.1,
      brief: 'Поставка обладнання для операційних. Потрібна реєстрація виробника в EUDAMED.', reasons: [], against: ['Не ваш профіль діяльності', 'Потрібна реєстрація EUDAMED'],
      requirements: [{ text: 'Реєстрація в EUDAMED', page: 4, clause: '1.3', status: 'missing' }], risks: [{ level: 'high', text: 'Немає досвіду в медичних поставках', page: 0 }], docs: [{ name: 'Zadávací dokumentace.pdf', pages: 56 }] }),
    T({ id: 'PL-2026-80144', title: 'Budowa farmy fotowoltaicznej 4 MW', titleUa: 'Будівництво сонячної електростанції 4 МВт', buyer: 'Spółka komunalna (demo)', country: 'PL', city: 'Gdansk', cityName: 'Гданськ', source: 'e-Zamówienia', cpv: '09332000', cpvName: 'Сонячні установки', category: 'energy', value: 3100000, deadline: 31, published: 22, match: 77, verdict: 'consider', bidders: 6, discount: 10.4,
      brief: 'EPC-контракт на будівництво сонячної станції з підключенням до мережі. Обов’язкове 10-річне обслуговування.', reasons: ['Енергетика — ваш пріоритетний напрям'], against: ['Обслуговування 10 років у Польщі'],
      requirements: [{ text: 'Два EPC-проєкти СЕС від 2 МВт', page: 13, clause: 'VI.1', status: 'check' }], risks: [{ level: 'mid', text: 'Довгострокові сервісні зобов’язання', page: 27 }], docs: [{ name: 'SWZ.pdf', pages: 64 }] }),
    T({ id: 'UA-2026-1399', title: 'Енергоефективна модернізація ЦНАП', buyer: 'Міська рада (демо)', country: 'UA', city: 'Dnipro', cityName: 'Дніпро', source: 'ЄБРР', cpv: '45321000', cpvName: 'Теплоізоляційні роботи', category: 'wind', value: 710000, deadline: 37, published: 5, match: 83, verdict: 'bid', bidders: 3, discount: 7.0,
      brief: 'Утеплення будівлі, заміна вікон і встановлення ІТП в рамках програми ЄБРР «Зелені міста». Процедура ЄБРР, документи англійською й українською.', reasons: ['Ви виконували проєкти «Зелених міст»', 'Двомовна документація'], against: [],
      requirements: [{ text: 'Досвід енергоефективних робіт', page: 18, clause: 'ITT 6', status: 'ok', doc: 'lib-3' }, { text: 'Bid Security €14 000', page: 9, clause: 'ITT 12', status: 'missing' }], risks: [{ level: 'low', text: 'Звітність за стандартами ЄБРР', page: 52 }], docs: [{ name: 'Tender Dossier.pdf', pages: 140 }] }),
    T({ id: 'SK-2026-0415', title: 'Rekonštrukcia električkovej trate', titleUa: 'Реконструкція трамвайної колії', buyer: 'Dopravný podnik (demo)', country: 'SK', city: 'Bratislava', cityName: 'Братислава', source: 'TED', cpv: '45234121', cpvName: 'Трамвайні колії', category: 'city', value: 7400000, deadline: 45, published: 50, match: 46, verdict: 'skip', bidders: 4, discount: 5.5,
      brief: 'Реконструкція 3,2 км трамвайної колії. Потрібен залізничний допуск.', reasons: [], against: ['Немає залізничного допуску', 'Бюджет вище вашого максимуму'],
      requirements: [{ text: 'Допуск до робіт на рейковій інфраструктурі', page: 15, clause: 'B.2', status: 'missing' }], risks: [{ level: 'high', text: 'Кваліфікація не виконується', page: 15 }], docs: [{ name: 'Súťažné podklady.pdf', pages: 97 }] }),
    T({ id: 'UA-2026-1421', title: 'Кібербезпека для органів влади, рамкова угода', buyer: 'Держспецзв’язку (демо)', country: 'UA', city: 'Kyiv', cityName: 'Київ', source: 'Prozorro', cpv: '72212730', cpvName: 'ПЗ безпеки', category: 'it', value: 880000, deadline: 14, published: 6, match: 52, verdict: 'consider', bidders: 5, discount: 6.6,
      brief: 'Рамкова угода на 2 роки: моніторинг безпеки і реагування на інциденти. Потрібен атестат КСЗІ.', reasons: ['ІТ-підрозділ у вашій групі компаній'], against: ['Потрібен атестат КСЗІ'],
      requirements: [{ text: 'Атестат відповідності КСЗІ', page: 10, clause: '2.3', status: 'missing' }], risks: [{ level: 'mid', text: 'Рамкова угода не гарантує обсягів', page: 3 }], docs: [{ name: 'Тендерна документація.pdf', pages: 38 }] }),
    T({ id: 'UA-2026-1450', title: 'Відновлення мосту на трасі М-06, ділянка 3', buyer: 'Служба автомобільних доріг (демо)', country: 'UA', city: 'Kyiv', cityName: 'Київська обл.', source: 'Світовий банк', cpv: '45221111', cpvName: 'Будівництво мостів', category: 'bridge', value: 4600000, deadline: 41, published: 9, match: 71, verdict: 'consider', bidders: 4, discount: 6.9,
      brief: 'Відновлення пошкодженого мосту довжиною 96 м. Процедура Світового банку, консорціуми допускаються. Обов’язкова сертифікація системи якості ISO 9001.', reasons: ['Мости у профілі', 'Консорціум допускається'], against: ['Оборот на межі порогу'],
      requirements: [{ text: 'ISO 9001', page: 30, clause: 'ITB 4.5', status: 'ok', doc: 'lib-8' }, { text: 'Середній оборот від $4 млн', page: 33, clause: 'Sec. III 2.3', status: 'check' }], risks: [{ level: 'mid', text: 'Оборот на межі — краще з партнером', page: 33 }], docs: [{ name: 'Request for Bids.pdf', pages: 236 }] }),
    T({ id: 'AT-2026-1876', title: 'Facility Management für Verwaltungsgebäude, 3 Jahre', titleUa: 'Обслуговування адміністративних будівель, 3 роки', buyer: 'Bundesimmobilien (demo)', country: 'AT', city: 'Vienna', cityName: 'Відень', source: 'TED', cpv: '79993000', cpvName: 'Управління будівлями', category: 'office', value: 1200000, deadline: 29, published: 36, match: 33, verdict: 'skip', bidders: 8, discount: 4.8,
      brief: 'Комплексне обслуговування 6 будівель. Потрібна присутність персоналу у Відні.', reasons: [], against: ['Потрібен місцевий персонал'], requirements: [], risks: [{ level: 'high', text: 'Немає присутності в Австрії', page: 0 }], docs: [{ name: 'Ausschreibung.pdf', pages: 44 }] })
  ];

  const LIBRARY = [
    { id: 'lib-1', type: 'Статут', name: 'Статут ТОВ (редакція 2024)', valid: null, size: '2,1 МБ' },
    { id: 'lib-2', type: 'Ліцензія', name: 'Дозвіл на роботи підвищеної небезпеки', valid: 410, size: '840 КБ' },
    { id: 'lib-3', type: 'Довідка', name: 'Довідка про аналогічні договори (4 договори)', valid: null, size: '1,3 МБ' },
    { id: 'lib-4', type: 'Сертифікат', name: 'Сертифікати інженерів технагляду (2 особи)', valid: 14, size: '620 КБ' },
    { id: 'lib-5', type: 'Довідка', name: 'Матеріально-технічна база', valid: null, size: '980 КБ' },
    { id: 'lib-6', type: 'Довідка', name: 'Відсутність податкової заборгованості', valid: 6, size: '210 КБ' },
    { id: 'lib-7', type: 'Сертифікат', name: 'Сертифікати CE на LED-світильники', valid: 590, size: '3,4 МБ' },
    { id: 'lib-8', type: 'Сертифікат', name: 'ISO 9001:2015', valid: 230, size: '450 КБ' },
    { id: 'lib-9', type: 'Кейс', name: 'Кейс: реконструкція котельні лікарні, 2025', valid: null, size: '5,8 МБ' },
    { id: 'lib-10', type: 'CV', name: 'CV керівника проєкту', valid: null, size: '180 КБ' }
  ];

  const COMPANY = { name: 'ТОВ «Галбуд-Інжиніринг»', code: '41234567', city: 'Львів', employees: 64, turnover: '€6,2 млн', cpv: ['45331000 Опалення', '45231300 Водопровідні мережі', '45453000 Капремонт', '45321000 Теплоізоляція', '45221111 Мости'], regions: ['Україна', 'Польща', 'ЄС (TED)'], budget: [100000, 5000000] };
  const USER = { name: 'Олег Коваль', role: 'Власник', initials: 'ОК' };
  const TEAM = [{ name: 'Олег Коваль', role: 'Власник', initials: 'ОК' }, { name: 'Ірина Мельник', role: 'Тендерний менеджер', initials: 'ІМ' }, { name: 'Андрій Гнатюк', role: 'Кошторисник', initials: 'АГ' }];

  const STAGES = [
    { id: 'new', name: 'Нові' }, { id: 'analysis', name: 'Аналіз' }, { id: 'prep', name: 'Підготовка' }, { id: 'submitted', name: 'Подано' }, { id: 'result', name: 'Результат' }
  ];
  const PIPELINE_DEFAULT = { 'UA-2026-1041': 'prep', 'UA-2026-1188': 'analysis', 'UA-2026-1302': 'analysis', 'UA-2026-1355': 'new', 'PL-2026-77812': 'new', 'UA-2026-1399': 'submitted', 'UA-2026-1450': 'new' };
  const OWNERS = { 'UA-2026-1041': 'ІМ', 'UA-2026-1188': 'ОК', 'UA-2026-1302': 'ІМ', 'UA-2026-1399': 'АГ' };

  const ANALYTICS = {
    months: ['Тра', 'Чер', 'Лип', 'Сер', 'Вер', 'Жов'],
    submitted: [3, 4, 3, 6, 5, 7], won: [1, 1, 0, 2, 2, 3],
    byCpv: [['Опалення', 7.8], ['Водопровід', 8.6], ['Капремонт', 5.3], ['Теплоізоляція', 7.0], ['Мости', 6.9], ['Освітлення', 11.2]],
    buyers: [['Обласна клінічна лікарня', 6, 2], ['КП «Водоканал»', 4, 1], ['Управління капбудівництва', 9, 3], ['Міська рада, Дніпро', 3, 1]]
  };

  window.TENDERA = { PHOTOS, COUNTRIES, UAH, TENDERS, LIBRARY, COMPANY, USER, TEAM, STAGES, PIPELINE_DEFAULT, OWNERS, ANALYTICS };
})();

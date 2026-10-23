/* Тексты сайта на четырёх языках. Основной — кыргызский (ky).
   В разметке у элементов стоят data-i18n="ключ" (HTML), data-i18n-aria="ключ" (aria-label), data-wa="ключ" (текст для WhatsApp). */

export const LANGS = ['ky', 'ru', 'fr', 'en'];
export const DEFAULT_LANG = 'ky';

const D = {
  ky: {
    title: `Ля Вуа Лакте — сүт заводу, Бишкек`,
    desc: `Ля Вуа Лакте (Токтогул сүт) — Бишкектеги сүт заводу. Быштак, йогурт, сары май, сүзмө жана башка табигый сүт азыктары.`,
    ogTitle: `Ля Вуа Лакте — сүт заводу`,
    ogDesc: `Табигый сүт азыктары: быштак, йогурт, май, сүзмө. Бишкек.`,
    brand: `Ля Вуа Лакте`, brandSub: `Токтогул сүт`,
    ariaTop: `Ля Вуа Лакте — жогору`, ariaNav: `Бөлүмдөр`, ariaMenu: `Меню`,
    ariaStory: `Сүттүн жолу: сүттөн быштакка чейин`, ariaRail: `Этаптар`, ariaLang: `Тил`,
    navStory: `Сүттүн жолу`, navAbout: `Завод жөнүндө`, navProducts: `Продукция`, navContacts: `Байланыш`,
    heroEyebrow: `Бишкек · 2018-жылдан бери`,
    heroH1: `Даамга<br><em>айланган</em><br>сүт`,
    heroLead: `Ля Вуа Лакте — сүт заводу. Табигый сүттөн жасалган быштак, йогурт, сары май жана сүзмө.`,
    ctaOrder: `WhatsApp аркылуу буйрутма`, ctaAbout: `Завод жөнүндө`,
    c1e: `Сүт`, c1h: `Баары бир<br>агымдан башталат`,
    c1p: `Жаңы саалган сүт заводго келет — ак, коюу, тирүү. Мындан ары ал чоң нерсеге айланышы керек.`,
    c2e: `Уюу`, c2h: `Тамчы<br>уймакка айланат`,
    c2p: `Сүт сүзмөнүн данына айланат — келечектеги быштактын жана сүзмөнүн негизи.`,
    c3e: `Калыптоо`, c3h: `Пресс. Калып.<br>Алтын кабык`,
    c3p: `Масса пресстин астында тыгыздалып, баштын формасын алат.`,
    c4e: `Бышуу`, c4h: `Тынчтык,<br>салкындык жана убакыт`,
    c4p: `Жертөлөдө баштар даамын топтойт. Бул жерде шашуунун кереги жок.`,
    c5e: `Продукция`,
    cap1h: `Быштактар`, cap1p: `Жаңысынан бышканына чейин — дасторконго жана чайга.`,
    cap2h: `Йогурттар`, cap2p: `Назик түзүлүш, таза сүт даамы.`,
    cap3h: `Сары май`, cap3p: `Каймактын коюу даамы — нанга жана бышырууга.`,
    cap4h: `Сүзмө`, cap4p: `Жана башка сүт азыктары — бүгүн эмне бар экенин сураңыз.`,
    rail1: `Сүт`, rail2: `Быштак`, rail3: `Бышуу`, rail4: `Продукция`,
    rail5: `Даам`,
    c6e: `Даам`,
    m1h: `Бир тамчы —<br>бүтүн даам`, m1p: `Сүт бочкадан чоң ваннага куюлгандай — акырын жана мол.`,
    m2h: `Даамды<br>сезиңиз`, m2p: `WhatsApp аркылуу жазыңыз — ассортимент жана шарттар боюнча жооп беребиз.`,
    hint: `Ылдый жылдырыңыз`,
    aboutEyebrow: `Завод жөнүндө`,
    statement: `Биз табигый сүттөн сүт азыктарын жасайбыз — быштак, йогурт, май жана сүзмө — чыныгы даамды айырмалоого көнгөндөр үчүн.`,
    f1: `негизделген жыл`, f2t: `Бишкек`, f2d: `Кыргызстан`, f3d: `продукция багыты`,
    prodEyebrow: `Продукция`, prodH2: `Биз эмне жасайбыз`,
    p1h: `Быштактар`, p1p: `Жаңысынан бышканына чейин. Азыркы ассортимент — суроо боюнча.`,
    p2h: `Йогурттар`, p2p: `Эртең мененки тамакка жана жеңил закускага назик йогурттар.`,
    p3h: `Сары май`, p3p: `Каймактын чыныгы даамы — нанга жана бышырууга.`,
    p4h: `Сүзмө жана башкалар`, p4p: `Сүзмө жана башка сүт азыктары — бүгүн эмне бар экенин сураңыз.`,
    more: `WhatsApp'тан билүү`,
    contEyebrow: `Байланыш`, contH2: `Бизге жазыңыз —<br><em>WhatsApp'та жооп беребиз</em>`,
    lblAddr: `Дарек`, addr: `Бишкек ш., Панфилов көч., 134`, lblCompany: `Компания`, company: `«Ля Вуа Лакте» ЖЧК`,
    footCompany: `«Ля Вуа Лакте» ЖЧК`, footSub: `Токтогул сүт · Бишкек`,
    waHello: `Саламатсызбы! «Ля Вуа Лакте» продукциясы тууралуу билгим келет.`,
    waOrder: `Саламатсызбы! «Ля Вуа Лакте» продукциясына буйрутма бергим келет.`,
    waCheese: `Саламатсызбы! Быштактар кызыктырат. Эмнелер бар?`,
    waYogurt: `Саламатсызбы! Йогурттар кызыктырат. Эмнелер бар?`,
    waButter: `Саламатсызбы! Сары май кызыктырат. Эмнелер бар?`,
    waOther: `Саламатсызбы! Сүзмө жана башка сүт азыктары кызыктырат.`,
  },

  ru: {
    title: `Ля Вуа Лакте — молочный завод, Бишкек`,
    desc: `Ля Вуа Лакте (Токтогул сүт) — молочный завод в Бишкеке. Сыры, йогурты, сливочное масло, творог и другие натуральные молочные продукты.`,
    ogTitle: `Ля Вуа Лакте — молочный завод`,
    ogDesc: `Натуральные молочные продукты: сыры, йогурты, масло, творог. Бишкек.`,
    brand: `Ля Вуа Лакте`, brandSub: `Токтогул сүт`,
    ariaTop: `Ля Вуа Лакте — наверх`, ariaNav: `Разделы`, ariaMenu: `Меню`,
    ariaStory: `Путь молока: от молока до сыра`, ariaRail: `Этапы`, ariaLang: `Язык`,
    navStory: `Путь молока`, navAbout: `О заводе`, navProducts: `Продукция`, navContacts: `Контакты`,
    heroEyebrow: `Бишкек · с 2018 года`,
    heroH1: `Молоко,<br><em>которое становится</em><br>вкусом`,
    heroLead: `Ля Вуа Лакте — молочный завод. Сыры, йогурты, масло и творог из натурального молока.`,
    ctaOrder: `Заказать в WhatsApp`, ctaAbout: `О заводе`,
    c1e: `Молоко`, c1h: `Всё начинается<br>с одной струи`,
    c1p: `Свежее молоко приходит на завод — белое, плотное, живое. Дальше ему предстоит стать чем-то большим.`,
    c2e: `Свёртывание`, c2h: `Капля становится<br>сгустком`,
    c2p: `Молоко превращается в творожное зерно — основу будущих сыров и творога.`,
    c3e: `Формовка`, c3h: `Пресс. Форма.<br>Золотая корка`,
    c3p: `Масса уплотняется под прессом и принимает форму головки.`,
    c4e: `Созревание`, c4h: `Тишина,<br>прохлада и время`,
    c4p: `В погребе головки набирают вкус. Торопиться здесь некуда.`,
    c5e: `Продукция`,
    cap1h: `Сыры`, cap1p: `От свежих до выдержанных — на столе и к чаю.`,
    cap2h: `Йогурты`, cap2p: `Нежная текстура, чистый молочный вкус.`,
    cap3h: `Сливочное масло`, cap3p: `Густой вкус сливок — на хлеб и в выпечку.`,
    cap4h: `Творог`, cap4p: `И другие молочные продукты — спрашивайте, что есть сегодня.`,
    rail1: `Молоко`, rail2: `Сыр`, rail3: `Созревание`, rail4: `Продукция`,
    rail5: `Вкус`,
    c6e: `Вкус`,
    m1h: `Одна капля —<br>целый вкус`, m1p: `Молоко льётся неспешно и щедро — как из бочки в огромную ванну.`,
    m2h: `Почувствуйте<br>вкус`, m2p: `Напишите нам в WhatsApp — подскажем ассортимент и условия.`,
    hint: `Прокрутите`,
    aboutEyebrow: `О заводе`,
    statement: `Мы делаем молочные продукты из натурального молока — сыры, йогурты, масло и творог — для тех, кто привык различать настоящий вкус.`,
    f1: `год основания`, f2t: `Бишкек`, f2d: `Кыргызстан`, f3d: `направления продукции`,
    prodEyebrow: `Продукция`, prodH2: `Что мы делаем`,
    p1h: `Сыры`, p1p: `От свежих до выдержанных. Актуальный ассортимент — по запросу.`,
    p2h: `Йогурты`, p2p: `Нежные йогурты для завтрака и перекуса.`,
    p3h: `Сливочное масло`, p3p: `Настоящий вкус сливок — на хлеб и в выпечку.`,
    p4h: `Творог и другое`, p4p: `Творог и другие молочные продукты — спрашивайте, что есть сегодня.`,
    more: `Узнать в WhatsApp`,
    contEyebrow: `Контакты`, contH2: `Напишите нам —<br><em>ответим в WhatsApp</em>`,
    lblAddr: `Адрес`, addr: `г. Бишкек, ул. Панфилова, 134`, lblCompany: `Компания`, company: `ОсОО «Ля Вуа Лакте»`,
    footCompany: `ОсОО «Ля Вуа Лакте»`, footSub: `Токтогул сүт · Бишкек`,
    waHello: `Здравствуйте! Хочу узнать про продукцию «Ля Вуа Лакте».`,
    waOrder: `Здравствуйте! Хочу заказать продукцию «Ля Вуа Лакте».`,
    waCheese: `Здравствуйте! Интересуют сыры. Что есть в наличии?`,
    waYogurt: `Здравствуйте! Интересуют йогурты. Что есть в наличии?`,
    waButter: `Здравствуйте! Интересует сливочное масло. Что есть в наличии?`,
    waOther: `Здравствуйте! Интересует творог и другие молочные продукты.`,
  },

  fr: {
    title: `La Voie Lactée — laiterie, Bichkek`,
    desc: `La Voie Lactée (Toktogul süt) — laiterie à Bichkek. Fromages, yaourts, beurre, fromage blanc et autres produits laitiers naturels.`,
    ogTitle: `La Voie Lactée — laiterie`,
    ogDesc: `Produits laitiers naturels : fromages, yaourts, beurre, fromage blanc. Bichkek.`,
    brand: `La Voie Lactée`, brandSub: `Toktogul süt`,
    ariaTop: `La Voie Lactée — haut de page`, ariaNav: `Sections`, ariaMenu: `Menu`,
    ariaStory: `Le voyage du lait : du lait au fromage`, ariaRail: `Étapes`, ariaLang: `Langue`,
    navStory: `Le voyage du lait`, navAbout: `La laiterie`, navProducts: `Produits`, navContacts: `Contact`,
    heroEyebrow: `Bichkek · depuis 2018`,
    heroH1: `Le lait<br><em>qui devient</em><br>saveur`,
    heroLead: `La Voie Lactée est une laiterie. Fromages, yaourts, beurre et fromage blanc, faits de lait naturel.`,
    ctaOrder: `Commander sur WhatsApp`, ctaAbout: `La laiterie`,
    c1e: `Lait`, c1h: `Tout commence<br>par un filet`,
    c1p: `Le lait frais arrive à la laiterie — blanc, dense, vivant. Il est appelé à devenir bien plus.`,
    c2e: `Caillage`, c2h: `Une goutte devient<br>caillé`,
    c2p: `Le lait se transforme en grains de caillé — la base des fromages et du fromage blanc à venir.`,
    c3e: `Moulage`, c3h: `Presse. Forme.<br>Croûte dorée`,
    c3p: `La masse se compacte sous la presse et prend la forme d'une meule.`,
    c4e: `Affinage`, c4h: `Silence,<br>fraîcheur et temps`,
    c4p: `À la cave, les meules prennent du goût. Ici, rien ne presse.`,
    c5e: `Produits`,
    cap1h: `Fromages`, cap1p: `Du frais à l'affiné — sur la table et avec le thé.`,
    cap2h: `Yaourts`, cap2p: `Texture délicate, goût pur de lait.`,
    cap3h: `Beurre`, cap3p: `Le goût franc de la crème — sur le pain et en pâtisserie.`,
    cap4h: `Fromage blanc`, cap4p: `Et d'autres produits laitiers — demandez ce qu'il y a aujourd'hui.`,
    rail1: `Lait`, rail2: `Fromage`, rail3: `Affinage`, rail4: `Produits`,
    rail5: `Saveur`,
    c6e: `Saveur`,
    m1h: `Une goutte,<br>tout un goût`, m1p: `Le lait coule lentement, généreusement — comme d'un tonneau dans un immense bain.`,
    m2h: `Goûtez<br>la différence`, m2p: `Écrivez-nous sur WhatsApp : nous vous renseignons sur l'assortiment et les conditions.`,
    hint: `Faites défiler`,
    aboutEyebrow: `La laiterie`,
    statement: `Nous fabriquons des produits laitiers à partir de lait naturel — fromages, yaourts, beurre et fromage blanc — pour ceux qui savent reconnaître le vrai goût.`,
    f1: `année de fondation`, f2t: `Bichkek`, f2d: `Kirghizistan`, f3d: `gammes de produits`,
    prodEyebrow: `Produits`, prodH2: `Ce que nous faisons`,
    p1h: `Fromages`, p1p: `Du frais à l'affiné. Assortiment actuel sur demande.`,
    p2h: `Yaourts`, p2p: `Des yaourts délicats pour le petit-déjeuner et la collation.`,
    p3h: `Beurre`, p3p: `Le vrai goût de la crème — sur le pain et en pâtisserie.`,
    p4h: `Fromage blanc et plus`, p4p: `Fromage blanc et autres produits laitiers — demandez ce qu'il y a aujourd'hui.`,
    more: `Demander sur WhatsApp`,
    contEyebrow: `Contact`, contH2: `Écrivez-nous —<br><em>nous répondons sur WhatsApp</em>`,
    lblAddr: `Adresse`, addr: `Bichkek, rue Panfilov, 134`, lblCompany: `Société`, company: `OsOO « La Voie Lactée » (SARL)`,
    footCompany: `OsOO « La Voie Lactée »`, footSub: `Toktogul süt · Bichkek`,
    waHello: `Bonjour ! Je voudrais en savoir plus sur les produits de « La Voie Lactée ».`,
    waOrder: `Bonjour ! Je voudrais commander des produits de « La Voie Lactée ».`,
    waCheese: `Bonjour ! Les fromages m'intéressent. Qu'avez-vous en stock ?`,
    waYogurt: `Bonjour ! Les yaourts m'intéressent. Qu'avez-vous en stock ?`,
    waButter: `Bonjour ! Le beurre m'intéresse. Qu'avez-vous en stock ?`,
    waOther: `Bonjour ! Le fromage blanc et les autres produits laitiers m'intéressent.`,
  },

  en: {
    title: `La Voie Lactée — dairy, Bishkek`,
    desc: `La Voie Lactée (Toktogul süt) — a dairy in Bishkek. Cheese, yogurt, butter, cottage cheese and other natural dairy products.`,
    ogTitle: `La Voie Lactée — dairy`,
    ogDesc: `Natural dairy products: cheese, yogurt, butter, cottage cheese. Bishkek.`,
    brand: `La Voie Lactée`, brandSub: `Toktogul süt`,
    ariaTop: `La Voie Lactée — back to top`, ariaNav: `Sections`, ariaMenu: `Menu`,
    ariaStory: `The journey of milk: from milk to cheese`, ariaRail: `Stages`, ariaLang: `Language`,
    navStory: `Milk's journey`, navAbout: `The dairy`, navProducts: `Products`, navContacts: `Contact`,
    heroEyebrow: `Bishkek · since 2018`,
    heroH1: `Milk<br><em>that becomes</em><br>flavor`,
    heroLead: `La Voie Lactée is a dairy. Cheese, yogurt, butter and cottage cheese made from natural milk.`,
    ctaOrder: `Order on WhatsApp`, ctaAbout: `The dairy`,
    c1e: `Milk`, c1h: `It all begins<br>with a single stream`,
    c1p: `Fresh milk arrives at the dairy — white, rich, alive. Next, it is meant to become something more.`,
    c2e: `Curdling`, c2h: `A drop becomes<br>a curd`,
    c2p: `Milk turns into curd grains — the base of cheeses and cottage cheese to come.`,
    c3e: `Molding`, c3h: `Press. Shape.<br>Golden rind`,
    c3p: `The mass is compacted under the press and takes the shape of a wheel.`,
    c4e: `Aging`, c4h: `Silence,<br>coolness and time`,
    c4p: `In the cellar, the wheels develop their flavor. There is no hurry here.`,
    c5e: `Products`,
    cap1h: `Cheese`, cap1p: `From fresh to aged — for the table and for tea.`,
    cap2h: `Yogurt`, cap2p: `Delicate texture, pure milky taste.`,
    cap3h: `Butter`, cap3p: `The rich taste of cream — on bread and in baking.`,
    cap4h: `Cottage cheese`, cap4p: `And other dairy products — ask what is available today.`,
    rail1: `Milk`, rail2: `Cheese`, rail3: `Aging`, rail4: `Products`,
    rail5: `Taste`,
    c6e: `Taste`,
    m1h: `One drop,<br>a whole taste`, m1p: `Milk pours slow and generous — like from a barrel into a huge bath.`,
    m2h: `Taste the<br>difference`, m2p: `Message us on WhatsApp — we will share the range and terms.`,
    hint: `Scroll`,
    aboutEyebrow: `The dairy`,
    statement: `We make dairy products from natural milk — cheese, yogurt, butter and cottage cheese — for those who know how to tell real taste.`,
    f1: `year founded`, f2t: `Bishkek`, f2d: `Kyrgyzstan`, f3d: `product lines`,
    prodEyebrow: `Products`, prodH2: `What we make`,
    p1h: `Cheese`, p1p: `From fresh to aged. Current range on request.`,
    p2h: `Yogurt`, p2p: `Delicate yogurts for breakfast and snacks.`,
    p3h: `Butter`, p3p: `The real taste of cream — on bread and in baking.`,
    p4h: `Cottage cheese and more`, p4p: `Cottage cheese and other dairy products — ask what is available today.`,
    more: `Ask on WhatsApp`,
    contEyebrow: `Contact`, contH2: `Write to us —<br><em>we reply on WhatsApp</em>`,
    lblAddr: `Address`, addr: `Bishkek, Panfilov St., 134`, lblCompany: `Company`, company: `La Voie Lactée LLC`,
    footCompany: `La Voie Lactée LLC`, footSub: `Toktogul süt · Bishkek`,
    waHello: `Hello! I would like to learn about La Voie Lactée products.`,
    waOrder: `Hello! I would like to order La Voie Lactée products.`,
    waCheese: `Hello! I'm interested in cheese. What do you have in stock?`,
    waYogurt: `Hello! I'm interested in yogurt. What do you have in stock?`,
    waButter: `Hello! I'm interested in butter. What do you have in stock?`,
    waOther: `Hello! I'm interested in cottage cheese and other dairy products.`,
  },
};

/* язык из ?lang=, затем из сохранённого выбора, иначе кыргызский */
export function initialLang() {
  const q = new URLSearchParams(location.search).get('lang');
  if (LANGS.includes(q)) return q;
  try { const s = localStorage.getItem('lvl-lang'); if (LANGS.includes(s)) return s; } catch {}
  return DEFAULT_LANG;
}

export function saveLang(code) {
  try { localStorage.setItem('lvl-lang', code); } catch {}
}

const setAttr = (sel, attr, val) => { const el = document.querySelector(sel); if (el) el.setAttribute(attr, val); };

/* подставляет тексты выбранного языка в страницу */
export function applyLang(code) {
  const d = D[code] || D[DEFAULT_LANG];
  document.documentElement.lang = code;
  document.title = d.title;
  setAttr('meta[name="description"]', 'content', d.desc);
  setAttr('meta[property="og:title"]', 'content', d.ogTitle);
  setAttr('meta[property="og:description"]', 'content', d.ogDesc);
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.innerHTML = d[el.dataset.i18n] ?? el.innerHTML; });
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', d[el.dataset.i18nAria] ?? ''); });
  document.querySelectorAll('[data-wa]').forEach((a) => {
    a.href = `https://wa.me/996700309610?text=${encodeURIComponent(d[a.dataset.wa] || '')}`;
  });
  document.querySelectorAll('[data-lang]').forEach((b) => {
    const on = b.dataset.lang === code;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', String(on));
  });
}

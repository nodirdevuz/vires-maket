// VIRES v3 mockup generator. Reads ../data/products.json + articles.mjs and writes static HTML pages.
// Run: node _istochnik/build.mjs            (pages that open from disk)
//      MODE=prod node _istochnik/build.mjs  (clean /katalog/ links, as on a real server)
// In production the same templates run on the server from the database (see SEO.md).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MODE, SITE, TODAY, rub, abs, depthOf, L, img, ALT, I, jar, shell, ORG, U } from './layout.mjs';
import { ARTICLES, HUBS, PEOPLE } from './articles.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/products.json'), 'utf8'));
const P = Object.fromEntries(data.products.map(p => [p.id, p]));
const A = Object.fromEntries(ARTICLES.map(a => [a.slug, a]));
const HUB = Object.fromEntries(HUBS.map(h => [h.id, h]));
const written = [];

function write(p, html) {
  const file = path.join(ROOT, p, 'index.html');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  // @path/ placeholders inside content → correct relative or root links
  html = html.replace(/href="@([^"]*)"/g, (_, x) => `href="${L(depthOf(p), x)}"`);
  fs.writeFileSync(file, html);
  written.push(p);
}
const fmtDate = s => new Date(s + 'T12:00:00Z').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).replace(' г.', '');
const stars = n => `<span class="stars" aria-label="${n} из 5">${'★'.repeat(n)}${n < 5 ? `<s>${'★'.repeat(5 - n)}</s>` : ''}</span>`;
const prodUrl = p => 'katalog/' + p.slug + '/';
const cartUrl = p => MODE === 'prod' ? '/' + prodUrl(p) : prodUrl(p) + 'index.html';
const artUrl = a => 'zhurnal/' + a.slug + '/';

// ---------- shared schema pieces ----------
const SHIP = {
  '@type': 'OfferShippingDetails',
  shippingRate: { '@type': 'MonetaryAmount', value: 390, currency: 'RUB' },
  shippingDestination: [{ '@type': 'DefinedRegion', addressCountry: 'TR' }, { '@type': 'DefinedRegion', addressCountry: 'DE' }],
  deliveryTime: { '@type': 'ShippingDeliveryTime',
    handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 1, unitCode: 'DAY' },
    transitTime: { '@type': 'QuantitativeValue', minValue: 2, maxValue: 5, unitCode: 'DAY' } }
};
const RETURNS = {
  '@type': 'MerchantReturnPolicy', applicableCountry: ['TR', 'DE'],
  returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow', merchantReturnDays: 60,
  returnMethod: 'https://schema.org/ReturnByMail', returnFees: 'https://schema.org/FreeReturn'
};
function productLd(p, full) {
  const o = {
    '@type': 'Product', '@id': abs(prodUrl(p)) + '#product', name: p.name, sku: p.sku,
    description: p.short + ' ' + p.lead, brand: { '@type': 'Brand', name: 'VIRES' },
    category: 'Пищевые добавки', url: abs(prodUrl(p)), image: [SITE + '/img/' + p.slug + '.jpg'],
    offers: {
      '@type': 'Offer', url: abs(prodUrl(p)), price: p.price, priceCurrency: 'RUB',
      availability: p.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition', seller: { '@id': SITE + '/#org' },
      shippingDetails: SHIP, hasMerchantReturnPolicy: RETURNS
    }
  };
  if (full) {
    // ПРИМЕР: рейтинг и отзывы выдуманы для макета. До запуска заменить реальными из системы отзывов или удалить.
    o.aggregateRating = { '@type': 'AggregateRating', ratingValue: p.rating.value, reviewCount: p.rating.count, bestRating: 5 };
    o.review = p.reviews.map(r => ({ '@type': 'Review', author: { '@type': 'Person', name: r.name.split(',')[0] }, reviewRating: { '@type': 'Rating', ratingValue: r.stars, bestRating: 5 }, reviewBody: r.text }));
    o.additionalProperty = p.label.rows.map(r => ({ '@type': 'PropertyValue', name: r[0] + ' (' + r[1] + ')', value: r[2] + ' на ' + p.label.serving }));
  }
  return o;
}
const personLd = k => ({ '@type': 'Person', '@id': abs('zhurnal/') + '#' + PEOPLE[k].id, name: PEOPLE[k].name, jobTitle: PEOPLE[k].job, description: PEOPLE[k].bio, knowsAbout: PEOPLE[k].knows, url: abs('zhurnal/') + '#' + PEOPLE[k].id, worksFor: { '@id': SITE + '/#org' } });
const faqLd = list => ({ '@type': 'FAQPage', mainEntity: list.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) });
const faqHtml = (list, openFirst = true) => `<div class="faq">${list.map(([q, a], i) => `<details${i === 0 && openFirst ? ' open' : ''}><summary>${q}</summary><p>${a}</p></details>`).join('')}</div>`;

// ---------- components ----------
function card(p, d, { button = true, headTag = 'h3' } = {}) {
  return `<article class="card" data-goals="${p.goals.join(' ')}">
  <div class="card-media">${jar(p.jar)}</div>
  <div class="card-body">
    <${headTag}><a href="${L(d, prodUrl(p))}">${p.name}</a></${headTag}>
    <p class="what">${p.short}</p>
    <p class="pack">${p.pack}</p>
    <div class="card-foot"><span><span class="num">${rub(p.price)}</span>${p.oldPrice ? `<s class="old">${rub(p.oldPrice)}</s>` : ''}</span>${
      !p.inStock ? '<span class="tag-out">Нет в наличии</span>' :
      button ? `<button class="btn btn-line" type="button" data-add data-id="${p.id}" data-name="${p.name}" data-price="${p.price}" data-url="${cartUrl(p)}" aria-label="Добавить в корзину: ${p.name}">В корзину</button>` : `<span class="link" aria-hidden="true">${I.arrow}</span>`}</div>
  </div>
</article>`;
}
function postCard(a, d) {
  return `<article class="post">
  <div class="ph">${img(a.cover, ALT[a.cover], { sizes: '(min-width: 768px) 33vw, 100vw', ws: [480, 800], w: 800, h: 533 })}</div>
  <div class="meta"><b>${HUB[a.hub].name}</b><span>${a.read} минут</span></div>
  <h3><a href="${L(d, artUrl(a))}">${a.h1}</a></h3>
  <p>${a.card}</p>
</article>`;
}
function mini(p, d) {
  return `<div class="mini">${jar(p.jar, 58)}<a href="${L(d, prodUrl(p))}">${p.name}</a><span>${p.short} ${rub(p.price)}</span></div>`;
}

// ================= HOME =================
(function home() {
  const pth = '', d = 0;
  const best = ['core', 'night', 'zinc'].map(id => P[id]);
  const body = `
<section class="hero" aria-labelledby="h1">
  <div class="hero-grid">
    <div class="hero-media">${img('1549060279-7e168fcee0c2', ALT['1549060279-7e168fcee0c2'], { sizes: '(min-width: 900px) 50vw, 100vw', ws: [480, 800, 1200, 1600], w: 1600, h: 1067, pri: true })}</div>
    <div class="hero-copy">
      <h1 id="h1">Добавки для мужчин. <em>Состав до миллиграмма.</em></h1>
      <p class="lede">Цинк, витамин D3, магний и ашваганда KSM-66 в понятных дозах. Каждую партию проверяет независимая лаборатория.</p>
      <a href="${L(d, 'katalog/')}" class="btn btn-main">Смотреть каталог ${I.arrow}</a>
      <p class="guarantee">${I.shield}60 дней на возврат, даже за открытую банку</p>
    </div>
  </div>
</section>

<section class="proof" aria-label="Почему нам доверяют">
  <div class="wrap"><ul>
    <li><b>12 400</b>мужчин уже покупают у нас</li>
    <li><b>60 дней</b>на возврат денег</li>
    <li><b>Каждая партия</b>проверена в лаборатории</li>
    <li><b>Сделано в ЕС</b>по стандарту GMP</li>
  </ul></div>
</section>

<section aria-labelledby="best-h">
  <div class="wrap">
    <div class="sec-head">
      <div><h2 id="best-h">Чаще всего выбирают</h2></div>
      <a class="link" href="${L(d, 'katalog/')}">Весь каталог ${I.arrow}</a>
    </div>
    <div class="grid grid-3">${best.map(p => card(p, d, { button: false })).join('')}</div>
  </div>
</section>

<section class="rule" aria-labelledby="diff-h">
  <div class="wrap diff">
    <div class="ph">${img('1610725664285-7c57e6eeac3f', ALT['1610725664285-7c57e6eeac3f'], { sizes: '(min-width: 900px) 42vw, 100vw', ws: [480, 800, 1200], w: 1200, h: 1500 })}</div>
    <div>
      <span class="kicker">Чем мы отличаемся</span>
      <h2 id="diff-h">На банке написано всё, что внутри</h2>
      <ol class="points">
        <li><b>Доза каждого вещества</b><span>Без «секретных смесей». Если компонента нет в таблице, его нет в капсуле.</span></li>
        <li><b>Только разрешённые обещания</b><span>Пишем о пользе лишь то, что утвердил ЕС. Никаких «взрывных» эффектов.</span></li>
        <li><b>Без гормонов и стимуляторов</b><span>Витамины, минералы и растительный экстракт. Это не лекарство.</span></li>
      </ol>
    </div>
  </div>
</section>

<section class="lab-teaser" aria-labelledby="lab-h">
  <div class="wrap split">
    <div>
      <span class="kicker">Лаборатория</span>
      <h2 id="lab-h">Проверьте свою банку по номеру партии</h2>
      <p>Независимая лаборатория проверяет каждую партию: состав, тяжёлые металлы, микробиологию и вещества из списка WADA. Отчёт открыт до покупки.</p>
      <a class="btn btn-line" href="${L(d, 'laboratoriya/')}">Открыть отчёты</a>
    </div>
    <div class="ph">${img('1532187863486-abf9dbad1b69', ALT['1532187863486-abf9dbad1b69'], { sizes: '(min-width: 900px) 50vw, 100vw', ws: [480, 800, 1200], w: 1200, h: 900 })}</div>
  </div>
</section>

<section aria-labelledby="j-h">
  <div class="wrap">
    <div class="sec-head">
      <div><h2 id="j-h">Журнал</h2><p>Тестостерон, витамины, восстановление. Простым языком и со ссылками на исследования.</p></div>
      <a class="link" href="${L(d, 'zhurnal/')}">Все статьи ${I.arrow}</a>
    </div>
    <div class="posts">${ARTICLES.map(a => postCard(a, d)).join('')}</div>
    <p class="expert-line"><span class="ava" aria-hidden="true">ЕК</span><span>Каждую статью проверяет <b>д-р Елена Кая</b>, врач спортивной медицины.</span></p>
  </div>
</section>`;
  write(pth, shell({
    path: pth, data, active: 'home', body,
    title: 'VIRES — добавки для мужчин: цинк, витамин D3, магний, ашваганда',
    desc: 'Пищевые добавки для мужчин: цинк, витамин D3, магний, B6, K2 и ашваганда KSM-66 с дозой каждого вещества на банке. Лабораторный отчёт по каждой партии, возврат 60 дней.',
    schema: [ORG,
      { '@type': 'WebSite', '@id': SITE + '/#site', url: SITE + '/', name: 'VIRES', inLanguage: 'ru', publisher: { '@id': SITE + '/#org' } },
      { '@type': 'WebPage', '@id': SITE + '/#home', url: SITE + '/', name: 'VIRES — добавки для мужчин', isPartOf: { '@id': SITE + '/#site' }, about: { '@id': SITE + '/#org' }, inLanguage: 'ru', dateModified: TODAY }]
  }));
})();

// ================= CATALOG =================
(function catalog() {
  const pth = 'katalog/', d = 1;
  const chips = [{ id: '', name: 'Все', text: '' }, ...data.goals].map(g => `<a href="${L(d, 'katalog/')}${g.id ? '?cel=' + g.id : ''}" data-cel="${g.id}" data-text="${g.text}"${g.id === '' ? ' aria-current="true"' : ''}>${g.name}</a>`).join('');
  const body = `
<div class="wrap">
  <header class="page-head">
    <h1>Каталог добавок для мужчин</h1>
    <p class="lede">${data.products.length} продукта. Выберите цель или смотрите всё. Доставка 2–5 дней, бесплатно от ${rub(data.freeShippingFrom)}.</p>
  </header>
  <nav class="chips" aria-label="Цель">${chips}</nav>
  <p class="goal-note" data-goal-note aria-live="polite"></p>
  <p class="cat-count" data-count>Показано товаров: ${data.products.length}</p>
  <div class="grid grid-3" data-catalog>${data.products.map(p => card(p, d, { headTag: 'h2' })).join('')}</div>

  <div class="cat-help">
    <div><h2>Не знаете, что выбрать?</h2><p>Начните с VIRES Core: в нём цинк, D3, магний, B6, K2 и ашваганда. Или напишите нам, ответим за час.</p></div>
    <div class="contacts"><a class="btn btn-main" href="${L(d, 'katalog/vires-core/')}">VIRES Core</a><a class="btn btn-line" href="https://t.me/vires_example">Спросить в Telegram</a></div>
  </div>

  <section class="rule" aria-labelledby="goals-h" style="margin-top:clamp(56px,7vw,96px);padding-bottom:0">
    <h2 id="goals-h" style="margin-bottom:28px">Добавки по целям</h2>
    <ul class="tests">${data.goals.map(g => `<li><b>${g.name}</b><span>${g.text} ${data.products.filter(p => p.goals.includes(g.id)).map(p => `<a href="${L(d, prodUrl(p))}">${p.name}</a>`).join(', ')}.</span></li>`).join('')}</ul>
  </section>
</div>`;
  write(pth, shell({
    path: pth, data, active: 'katalog', body, crumbs: [['Каталог', null]],
    title: 'Каталог добавок для мужчин: цинк, D3, магний, комплексы | VIRES',
    desc: `Каталог VIRES: комплекс Core, вечерний Night, цинк 25 мг, витамин D3 + K2. Цены от ${rub(Math.min(...data.products.map(p => p.price)))}, подбор по цели: энергия, сон, гормональный фон, витамины.`,
    schema: [
      { '@type': 'CollectionPage', '@id': abs(pth), url: abs(pth), name: 'Каталог добавок для мужчин', isPartOf: { '@id': SITE + '/#site' }, inLanguage: 'ru' },
      { '@type': 'ItemList', name: 'Товары VIRES', numberOfItems: data.products.length, itemListElement: data.products.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: abs(prodUrl(p)), name: p.name })) }
    ]
  }));
})();

// ================= PRODUCT PAGES =================
for (const p of data.products) {
  const pth = prodUrl(p), d = 2;
  const goalNames = p.goals.map(g => data.goals.find(x => x.id === g).name);
  const rel = p.related.map(id => P[id]);
  const arts = p.articles.map(s => A[s]);
  const addAttrs = `data-add data-use-qty data-id="${p.id}" data-name="${p.name}" data-price="${p.price}" data-url="${cartUrl(p)}"`;
  const body = `
<div class="wrap">
  <div class="pdp">
    <div class="gallery" aria-label="Фото">
      <div class="g-main">${jar(p.jar)}<span class="sr">${p.name}, ${p.pack}</span></div>
      ${p.photos.map(ph => `<div class="ph">${img(ph, ALT[ph], { sizes: '(min-width: 960px) 28vw, 50vw', ws: [400, 800], w: 800, h: 800 })}</div>`).join('')}
    </div>
    <div class="buy-panel">
      <h1>${p.name}</h1>
      <p class="lede">${p.short} ${p.lead}</p>
      <p class="rate"><b>★ ${String(p.rating.value).replace('.', ',')}</b> · <a href="#otzyvy">${p.rating.count.toLocaleString('ru-RU')} отзывов</a></p>
      <div class="price-row"><span class="num">${rub(p.price)}</span>${p.oldPrice ? `<s class="old">${rub(p.oldPrice)}</s>` : ''}<small>${p.pack}</small></div>
      <p class="stock${p.inStock ? '' : ' out'}">${p.inStock ? 'В наличии, отправим завтра' : 'Нет в наличии'}</p>
      <div class="qty-row" id="buy-main">
        <div class="qty" role="group" aria-label="Количество"><button type="button" data-qty="-1" aria-label="Меньше">−</button><output data-qty-out value="1" aria-live="polite">1</output><button type="button" data-qty="1" aria-label="Больше">+</button></div>
        <button class="btn btn-main" type="button" ${addAttrs}${p.inStock ? '' : ' disabled'}>В корзину</button>
      </div>
      <p class="guarantee">${I.shield}60 дней на возврат, даже за открытую банку</p>
      <ul class="facts-mini">
        <li>${I.dot}<span><b>Доставка 2–5 дней.</b> Бесплатно от ${rub(data.freeShippingFrom)}.</span></li>
        <li>${I.dot}<span><b>Партия проверена.</b> <a href="${L(d, 'laboratoriya/')}">Отчёт лаборатории</a> по номеру на дне банки.</span></li>
        <li>${I.dot}<span><b>Цель:</b> ${goalNames.join(', ').toLowerCase()}.</span></li>
      </ul>
    </div>
  </div>

  <nav class="pdp-nav" aria-label="Разделы товара"><a href="#polza">Польза</a><a href="#sostav">Состав</a><a href="#priem">Как принимать</a><a href="#otzyvy">Отзывы</a><a href="#voprosy">Вопросы</a></nav>

  <section class="pdp-sec" id="polza" aria-labelledby="polza-h" style="padding-bottom:0">
    <h2 id="polza-h">Что даёт</h2>
    <ul class="claims">${p.claims.map(c => `<li><small>${c.who}</small><p>${c.text}</p></li>`).join('')}</ul>
    <p class="free">${p.claimsNote}</p>
  </section>

  <section class="pdp-sec" id="sostav" aria-labelledby="sostav-h" style="padding-bottom:0">
    <h2 id="sostav-h">Состав на ${p.label.serving}</h2>
    <div class="label">
      <div class="l-top"><b>${p.name}</b><span>${p.label.serving} · ${p.pack}</span></div>
      <table>
        <caption class="sr">Состав ${p.name} на ${p.label.serving}</caption>
        <thead><tr><th scope="col">Компонент</th><th scope="col">Доза</th><th scope="col">% НСП*</th></tr></thead>
        <tbody>${p.label.rows.map(r => `<tr><td>${r[0]}<small>${r[1]}</small></td><td>${r[2]}</td><td>${r[3]}</td></tr>`).join('')}</tbody>
        <tfoot><tr><td colspan="3">* НСП: норма суточного потребления для взрослых по Регламенту ЕС 1169/2011.${p.label.rows.some(r => r[3] === '**') ? ' ** Норма не установлена.' : ''}</td></tr></tfoot>
      </table>
    </div>
    <p class="free">${p.free}</p>
  </section>

  <section class="pdp-sec" id="priem" aria-labelledby="priem-h" style="padding-bottom:0">
    <h2 id="priem-h">Как принимать</h2>
    <ol class="howto">${p.howTo.map(h => `<li>${h}</li>`).join('')}</ol>
    <p class="caution"><b>Важно.</b> ${p.caution}</p>
  </section>

  <section class="pdp-sec" id="otzyvy" aria-labelledby="otz-h" style="padding-bottom:0">
    <h2 id="otz-h">Отзывы</h2>
    <div class="rate-sum"><span class="num">${String(p.rating.value).replace('.', ',')}</span><span>${stars(5)}<br>${p.rating.count.toLocaleString('ru-RU')} отзывов, только подтверждённые покупки</span><span class="example-tag">пример для макета</span></div>
    <div class="reviews">${p.reviews.map(r => `<figure>${stars(r.stars)}<blockquote>${r.text}</blockquote><figcaption><b>${r.name}</b>Покупка подтверждена</figcaption></figure>`).join('')}</div>
  </section>

  <section class="pdp-sec" id="voprosy" aria-labelledby="vop-h" style="padding-bottom:0">
    <h2 id="vop-h">Вопросы о ${p.name}</h2>
    <div class="narrow">${faqHtml(p.faq)}</div>
  </section>

  <section class="pdp-sec" aria-labelledby="rel-h" style="padding-bottom:var(--sec)">
    <h2 id="rel-h">По теме</h2>
    <div class="a-products">
      ${rel.map(r => mini(r, d)).join('')}
      ${arts.map(a => `<div class="mini"><div class="ph">${img(a.cover, '', { sizes: '64px', ws: [128, 256], w: 128, h: 128 })}</div><a href="${L(d, artUrl(a))}">${a.h1}</a><span>Журнал · ${a.read} минут</span></div>`).join('')}
    </div>
  </section>
</div>`;
  const bar = `<div class="buybar" id="buybar" aria-hidden="false"><div><b>${p.name}</b>${rub(p.price)} · ${p.pack}</div><button class="btn btn-main" type="button" ${addAttrs}${p.inStock ? '' : ' disabled'}>В корзину</button></div>`;
  write(pth, shell({
    path: pth, data, active: 'katalog', body, bodyEnd: bar,
    crumbs: [['Каталог', 'katalog/'], [p.name, null]],
    title: `${p.seoTitle} | VIRES`,
    desc: `${p.name} — ${p.short.toLowerCase()} ${p.pack[0].toUpperCase() + p.pack.slice(1)}. Цена ${rub(p.price)}, доставка 2–5 дней, отчёт лаборатории по каждой партии, возврат 60 дней.`,
    ogType: 'product',
    extraMeta: `<meta property="product:price:amount" content="${p.price}">\n<meta property="product:price:currency" content="RUB">\n`,
    schema: [productLd(p, true), faqLd(p.faq)]
  }));
}

// ================= LAB =================
(function lab() {
  const pth = 'laboratoriya/', d = 1;
  // ПРИМЕР: номера партий и результаты выдуманы для макета.
  const batches = [
    ['VR-2610', 'core', '2026-10-06', [['Цинк, заявлено 25 мг', '25,8 мг'], ['Витамин D3, заявлено 4000 МЕ', '4120 МЕ'], ['Магний, заявлено 300 мг', '306 мг'], ['Свинец, кадмий, ртуть', 'Ниже норм ЕС'], ['Микробиология', 'В норме'], ['Вещества из списка WADA', 'Не обнаружены']]],
    ['VR-2609', 'night', '2026-09-22', [['Магний, заявлено 300 мг', '297 мг'], ['Цинк, заявлено 10 мг', '10,3 мг'], ['Свинец, кадмий, ртуть', 'Ниже норм ЕС'], ['Вещества из списка WADA', 'Не обнаружены']]],
    ['VR-2607', 'zinc', '2026-09-01', [['Цинк, заявлено 25 мг', '25,4 мг'], ['Свинец, кадмий, ртуть', 'Ниже норм ЕС'], ['Вещества из списка WADA', 'Не обнаружены']]],
    ['VR-2605', 'd3', '2026-08-18', [['Витамин D3, заявлено 2000 МЕ', '2090 МЕ'], ['Витамин K2, заявлено 75 мкг', '77 мкг'], ['Окисление масла', 'В норме'], ['Вещества из списка WADA', 'Не обнаружены']]]
  ];
  const faq = [
    ['Где найти номер партии?', 'На дне банки или флакона, рядом со сроком годности. Он начинается с VR, например VR-2610.'],
    ['Кто проверяет партии?', 'Независимая лаборатория, аккредитованная по стандарту ISO/IEC 17025. Мы не владеем ею и не можем повлиять на результат.'],
    ['Что проверяют?', 'Количество каждого вещества против этикетки, тяжёлые металлы, микробиологию и вещества из запрещённого списка WADA.'],
    ['Что будет, если партия не прошла проверку?', 'Она не поступает в продажу. Отчёт всё равно публикуется.']
  ];
  const body = `
<div class="wrap">
  <header class="page-head">
    <h1>Лаборатория: отчёт по каждой партии</h1>
    <p class="lede">Каждую партию VIRES проверяет независимая лаборатория до продажи. Введите номер с дна банки и посмотрите результат: состав, тяжёлые металлы, микробиология, вещества из списка WADA.</p>
  </header>
  <div class="split" style="align-items:start">
    <form class="lookup" id="lookup" action="${L(d, 'laboratoriya/')}" method="get" role="search">
      <label for="partiya">Номер партии</label>
      <div class="row"><input id="partiya" name="partiya" placeholder="Например, VR-2610" autocomplete="off" autocapitalize="characters" spellcheck="false"><button class="btn btn-main" type="submit">Найти отчёт</button></div>
      <p class="hint">Номер напечатан на дне банки рядом со сроком годности.</p>
      <p class="lookup-msg" id="lookup-msg" role="status"></p>
    </form>
    <div class="ph" style="aspect-ratio:3/2">${img('1582719471384-894fbb16e074', ALT['1582719471384-894fbb16e074'], { sizes: '(min-width: 900px) 50vw, 100vw', ws: [480, 800, 1200], w: 1200, h: 800 })}</div>
  </div>

  <section aria-labelledby="b-h" style="padding-bottom:0">
    <div class="sec-head"><div><h2 id="b-h">Последние партии</h2><p>Нажмите на партию, чтобы открыть отчёт. Номера и цифры в макете — пример.</p></div></div>
    <div class="batches">${batches.map(([id, pid, dt, rows], i) => `
      <details id="${id}"${i === 0 ? ' open' : ''}>
        <summary><b>${id}</b><small>${P[pid].name} · проверено ${fmtDate(dt)}</small><span class="ok">${I.check}Пройдена</span></summary>
        <div class="cert"><div class="cert-top"><span>Отчёт лаборатории, партия ${id}</span><span>${P[pid].name}</span></div>
          <dl>${rows.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('')}</dl>
          <p class="hint" style="margin-top:14px;color:var(--dim);font-size:14px">Полный отчёт в PDF появится здесь на боевом сайте.</p>
        </div>
      </details>`).join('')}
    </div>
  </section>

  <section aria-labelledby="t-h" style="padding-bottom:0">
    <h2 id="t-h" style="margin-bottom:28px">Что проверяем</h2>
    <ul class="tests">
      <li><b>Состав против этикетки</b><span>Сколько каждого вещества на самом деле в капсуле. Допуск по правилам ЕС.</span></li>
      <li><b>Тяжёлые металлы</b><span>Свинец, кадмий, ртуть, мышьяк. Сравниваем с нормами ЕС для пищевых добавок.</span></li>
      <li><b>Микробиология</b><span>Бактерии, плесень, дрожжи.</span></li>
      <li><b>Список WADA</b><span>Запрещённые в спорте вещества. Важно тем, кто сдаёт допинг-тесты.</span></li>
    </ul>
  </section>

  <section aria-labelledby="s-h" style="padding-bottom:0">
    <h2 id="s-h" style="margin-bottom:32px">Как это устроено</h2>
    <ol class="steps">
      <li><h3>Партия готова</h3><p>С производства в ЕС берут образцы каждой партии.</p></li>
      <li><h3>Лаборатория</h3><p>Независимая лаборатория с аккредитацией ISO/IEC 17025 проверяет образцы.</p></li>
      <li><h3>Отчёт открыт</h3><p>Публикуем отчёт здесь. Не прошла проверку — не продаём.</p></li>
    </ol>
  </section>

  <section aria-labelledby="lf-h">
    <h2 id="lf-h" style="margin-bottom:20px">Вопросы о проверке</h2>
    <div class="narrow">${faqHtml(faq, false)}</div>
  </section>
</div>`;
  write(pth, shell({
    path: pth, data, active: 'laboratoriya', body, crumbs: [['Лаборатория', null]],
    title: 'Лаборатория: проверка партии добавок по номеру | VIRES',
    desc: 'Отчёт независимой лаборатории по каждой партии VIRES: состав против этикетки, тяжёлые металлы, микробиология, вещества из списка WADA. Проверьте номер с дна банки.',
    schema: [{ '@type': 'WebPage', '@id': abs(pth), url: abs(pth), name: 'Лаборатория VIRES: отчёты по партиям', isPartOf: { '@id': SITE + '/#site' }, inLanguage: 'ru', dateModified: TODAY }, faqLd(faq)]
  }));
})();

// ================= JOURNAL INDEX =================
(function journal() {
  const pth = 'zhurnal/', d = 1;
  const body = `
<div class="wrap">
  <header class="page-head">
    <h1>Журнал VIRES: тестостерон, витамины, восстановление</h1>
    <p class="lede">Статьи о мужском здоровье и тренировках простым языком. Каждая начинается с короткого ответа, ссылается на исследования и проверена врачом. Новая статья каждые 5 дней.</p>
    <nav class="hubs-nav" aria-label="Темы журнала">${HUBS.map(h => `<a href="#${h.id}">${h.name}</a>`).join('')}</nav>
  </header>
  <div class="posts">${ARTICLES.map(a => postCard(a, d)).join('')}</div>
</div>
${HUBS.map(h => `
<section class="hub" id="${h.id}" aria-labelledby="${h.id}-h">
  <div class="wrap hub-grid">
    <div><h2 id="${h.id}-h">${h.name}</h2><p>${h.intro}</p>${h.id === 'peptidy' ? '<p class="note-box">Пептиды мы не продаём. Раздел только объясняет.</p>' : ''}</div>
    <ul class="alist">${h.items.map(it => Array.isArray(it) ? (a => `<li><a href="${L(d, artUrl(a))}"><span><strong>${a.h1}</strong><small>${a.read} минут · обновлено ${fmtDate(a.modified)}</small></span>${I.arrow}</a></li>`)(A[it[0]])
      : `<li><span class="soon"><span><strong>${it.soon}</strong><small>Выйдет ${fmtDate(it.date)}</small></span></span></li>`).join('')}</ul>
  </div>
</section>`).join('')}
<section class="hub" id="avtory" aria-labelledby="avt-h">
  <div class="wrap">
    <h2 id="avt-h" style="margin-bottom:28px">Кто пишет и проверяет</h2>
    <div class="people">${Object.values(PEOPLE).map(p => `<div class="person" id="${p.id}"><span class="ava" aria-hidden="true">${p.ini}</span><div><b>${p.name}</b><p>${p.bio}</p></div></div>`).join('')}</div>
    <p class="muted" style="font-size:14px;margin-top:16px">В макете имена — пример. Перед запуском: настоящие люди, фото и дипломы.</p>
  </div>
</section>`;
  write(pth, shell({
    path: pth, data, active: 'zhurnal', body, crumbs: [['Журнал', null]],
    title: 'Журнал о мужском здоровье: тестостерон, витамины, пептиды | VIRES',
    desc: 'Статьи о тестостероне, цинке, витамине D, восстановлении и пептидах в спорте. Короткий ответ в начале, ссылки на исследования, проверка врачом. Новая статья каждые 5 дней.',
    schema: [
      { '@type': 'CollectionPage', '@id': abs(pth), url: abs(pth), name: 'Журнал VIRES', isPartOf: { '@id': SITE + '/#site' }, inLanguage: 'ru',
        hasPart: HUBS.map(h => ({ '@type': 'CollectionPage', name: h.name, url: abs(pth) + '#' + h.id, description: h.intro })) },
      { '@type': 'ItemList', name: 'Статьи журнала', itemListElement: ARTICLES.map((a, i) => ({ '@type': 'ListItem', position: i + 1, url: abs(artUrl(a)), name: a.h1 })) },
      personLd('arda'), personLd('elena')
    ]
  }));
})();

// ================= ARTICLES =================
for (const a of ARTICLES) {
  const pth = artUrl(a), d = 2;
  const hub = HUB[a.hub], au = PEOPLE[a.author], rv = PEOPLE[a.reviewer];
  const words = (a.answer + a.body + a.faq.flat().join(' ')).replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  const body = `
<article>
  <div class="wrap">
    <header class="a-head">
      <div class="meta"><b>${hub.name}</b><span>${a.read} минут чтения</span><span>Обновлено <time datetime="${a.modified}">${fmtDate(a.modified)}</time></span></div>
      <h1>${a.h1}</h1>
      <p class="answer">${a.answer}</p>
      <div class="byline">
        <div><span class="ava" aria-hidden="true">${au.ini}</span><span><b><a href="${L(d, 'zhurnal/#' + au.id)}">${au.name}</a></b>Текст. ${au.job}</span></div>
        <div><span class="ava" aria-hidden="true">${rv.ini}</span><span><b><a href="${L(d, 'zhurnal/#' + rv.id)}">${rv.name}</a></b>Проверила. ${rv.job}</span></div>
      </div>
    </header>
    <div class="ph a-cover">${img(a.cover, ALT[a.cover], { sizes: '(min-width: 1200px) 1140px, 100vw', ws: [480, 800, 1200, 1600], w: 1600, h: 686, pri: true })}</div>
    <div class="a-layout">
      <nav class="toc" aria-label="Содержание статьи"><details><summary>Содержание</summary><h2>Содержание</h2><ol>${a.toc.map(([id, t]) => `<li><a href="#${id}">${t}</a></li>`).join('')}</ol></details></nav>
      <div class="prose">
        <aside class="keyfacts" aria-labelledby="kf"><h2 id="kf">Коротко</h2><ol>${a.facts.map(([t, s]) => `<li>${t}<sup><a href="#src-${s}">[${s}]</a></sup></li>`).join('')}</ol></aside>
        ${a.body}
        <h2 id="voprosy">Вопросы</h2>
        ${faqHtml(a.faq)}
        <h2 id="tovary">По теме в каталоге</h2>
        <div class="a-products">${a.products.map(id => mini(P[id], d)).join('')}</div>
        <div class="hub-back"><span>Тема: <a href="${L(d, 'zhurnal/#' + hub.id)}">все статьи о теме «${hub.name}»</a></span>${(a.also || []).map(h => `<span><a href="${L(d, 'zhurnal/#' + h)}">${HUB[h].name}</a></span>`).join('')}</div>
        <aside class="reviewed" aria-label="Кто проверил статью"><span class="ava" aria-hidden="true">${rv.ini}</span><p><b>Проверила ${rv.name}</b>, ${rv.job.toLowerCase()}. Мы обновляем статью, когда выходят новые исследования. Опубликовано ${fmtDate(a.published)}, последняя проверка ${fmtDate(a.modified)}.</p></aside>
        <h2 id="istochniki">Источники</h2>
        <ol class="sources">${a.sources.map((s, i) => `<li id="src-${i + 1}">${s}</li>`).join('')}</ol>
        <p class="muted" style="font-size:14px">Статья носит информационный характер и не заменяет консультацию врача.</p>
      </div>
    </div>
  </div>
</article>`;
  write(pth, shell({
    path: pth, data, active: 'zhurnal', body, ogType: 'article', ogImage: a.cover,
    crumbs: [['Журнал', 'zhurnal/'], [hub.name, 'zhurnal/#' + hub.id], [a.h1.split(':')[0], null]],
    title: a.title, desc: a.desc,
    extraMeta: `<meta property="article:published_time" content="${a.published}T09:00:00+03:00">\n<meta property="article:modified_time" content="${a.modified}T09:00:00+03:00">\n<meta property="article:section" content="${hub.name}">\n<meta name="author" content="${au.name}">\n`,
    schema: [
      { '@type': 'Article', '@id': abs(pth) + '#article', headline: a.h1, description: a.desc, abstract: a.answer,
        image: [U(a.cover, 1200)], inLanguage: 'ru', datePublished: a.published + 'T09:00:00+03:00', dateModified: a.modified + 'T09:00:00+03:00',
        wordCount: words, articleSection: hub.name, keywords: a.keywords.join(', '),
        author: { '@id': abs('zhurnal/') + '#' + au.id }, publisher: { '@id': SITE + '/#org' }, mainEntityOfPage: { '@id': abs(pth) },
        citation: a.sources, mentions: a.products.map(id => ({ '@id': abs(prodUrl(P[id])) + '#product' })) },
      { '@type': 'WebPage', '@id': abs(pth), url: abs(pth), name: a.h1, isPartOf: { '@id': SITE + '/#site' }, inLanguage: 'ru',
        reviewedBy: { '@id': abs('zhurnal/') + '#' + rv.id }, lastReviewed: a.modified,
        speakable: { '@type': 'SpeakableSpecification', cssSelector: ['.answer', '.keyfacts'] } },
      personLd(a.author), personLd(a.reviewer), ORG, faqLd(a.faq)
    ]
  }));
}

// ================= FAQ =================
(function faqPage() {
  const pth = 'voprosy/', d = 1;
  const groups = [
    ['sostav', 'Состав и безопасность', [
      ['Это гормоны или стероиды?', 'Нет. Это пищевые добавки: витамины, минералы и растительный экстракт. Гормонов в составе нет, это не лекарство.'],
      ['Вы продаёте тестостерон или пептиды?', 'Нет. Тестостерон — рецептурное лекарство, его назначает врач. Пептиды для спорта запрещены WADA и не разрешены как добавки. В журнале мы объясняем, что это такое, но продаём только пищевые добавки.'],
      ['Можно спортсменам, которые сдают допинг-тесты?', 'Каждую партию проверяют на вещества из списка WADA. Отчёт по номеру партии открыт в разделе «Лаборатория».'],
      ['Есть противопоказания?', 'Если вы принимаете лекарства или у вас хронические болезни, посоветуйтесь с врачом. Не для лиц младше 18 лет.']]],
    ['priem', 'Приём', [
      ['Как принимать VIRES Core?', '3 капсулы утром во время еды.'],
      ['Можно сочетать продукты VIRES?', 'Не все. VIRES Core уже содержит цинк и витамин D3, поэтому к нему не нужны отдельные цинк и D3. VIRES Night не сочетается с Core. D3 + K2 можно с Цинком и с Night.'],
      ['Когда ждать результата?', 'Витамины и минералы действуют, когда восполняют нехватку: обычно это недели. Честнее всего сдать анализы до начала и через 2–3 месяца.']]],
    ['dostavka', 'Доставка и оплата', [
      ['Куда доставляете и сколько ждать?', 'По Турции и странам ЕС, 2–5 дней. Отправляем на следующий день после заказа.'],
      ['Сколько стоит доставка?', `390 ₽, бесплатно при заказе от ${rub(data.freeShippingFrom)}. Цифры в макете — пример.`],
      ['Как оплатить?', 'Банковской картой на сайте. Способы оплаты уточняются к запуску.']]],
    ['vozvrat', 'Возврат', [
      ['Можно вернуть открытую банку?', 'Да. В течение 60 дней после покупки вернём полную стоимость, даже за открытую банку. Напишите нам, обратная доставка бесплатная.'],
      ['Сколько ждать денег?', 'До 10 рабочих дней после того, как мы получим банку.']]]
  ];
  const all = groups.flatMap(g => g[2]);
  const body = `
<div class="wrap">
  <header class="page-head">
    <h1>Вопросы и ответы</h1>
    <p class="lede">Состав, приём, доставка и возврат. Не нашли ответ — напишите, отвечаем в течение часа с 9 до 21.</p>
    <nav class="hubs-nav" aria-label="Разделы">${groups.map(g => `<a href="#${g[0]}">${g[1]}</a>`).join('')}</nav>
  </header>
  <div class="narrow">
    ${groups.map(g => `<div class="faq-group"><h2 id="${g[0]}">${g[1]}</h2>${faqHtml(g[2], false)}</div>`).join('')}
    <div class="contact-box"><h2>Остался вопрос?</h2><p>Пишите в Telegram или на почту. Отвечаем по-русски.</p><div class="contacts"><a class="btn btn-main" href="https://t.me/vires_example">Telegram</a><a class="btn btn-line" href="mailto:hello@vires.example">Почта</a></div></div>
  </div>
</div>
<div style="height:var(--sec)"></div>`;
  write(pth, shell({
    path: pth, data, active: 'voprosy', body, crumbs: [['Вопросы', null]],
    title: 'Вопросы о добавках VIRES: состав, приём, доставка, возврат',
    desc: `Ответы на частые вопросы: есть ли гормоны в составе, как принимать, можно ли спортсменам, доставка 2–5 дней, бесплатно от ${rub(data.freeShippingFrom)}, возврат 60 дней.`,
    schema: [faqLd(all)]
  }));
})();

// ================= CART (noindex) =================
(function cart() {
  const pth = 'korzina/', d = 1;
  const body = `
<div class="wrap narrow">
  <header class="page-head"><h1>Корзина</h1></header>
  <div id="cart-empty"><p class="empty">Корзина пуста.</p><a class="btn btn-main" href="${L(d, 'katalog/')}">В каталог</a></div>
  <div id="cart-full" hidden>
    <ul class="cart-list" id="cart-list" data-free="${data.freeShippingFrom}" data-root="${MODE === 'prod' ? '' : '../'.repeat(d)}"></ul>
    <div class="cart-sum"><span>Итого</span><span class="num" id="cart-sum">0 ₽</span></div>
    <p class="ship-note" id="cart-ship"></p>
    <button class="btn btn-main btn-wide" type="button" disabled>Оформить заказ</button>
    <p class="guarantee">${I.shield}60 дней на возврат, даже за открытую банку</p>
    <p class="muted" style="font-size:14px;margin-top:12px">В макете оформление заказа не работает.</p>
  </div>
</div>
<div style="height:var(--sec)"></div>`;
  write(pth, shell({ path: pth, data, active: '', body, noindex: true, crumbs: [['Корзина', null]], title: 'Корзина | VIRES', desc: 'Корзина' }));
})();

// ================= ADMIN MOCKUP (noindex) =================
(function admin() {
  const pth = 'admin/', d = 1;
  const body = `
<div class="wrap adm">
  <div class="adm-top"><h1>Товары</h1><a class="btn btn-main" href="#novyi">Добавить товар</a></div>
  <p class="muted" style="margin-bottom:20px">Макет админки. Цену и наличие можно менять прямо в таблице. В макете ничего не сохраняется.</p>
  <form data-adm-save>
  <div class="adm-table"><table>
    <thead><tr><th scope="col">Товар</th><th scope="col">Цель</th><th scope="col">Цена, ₽</th><th scope="col">Старая цена</th><th scope="col">В наличии</th><th scope="col"><span class="sr">Действия</span></th></tr></thead>
    <tbody>${data.products.map(p => `<tr>
      <td><b>${p.name}</b><small>${p.sku} · ${p.pack}</small></td>
      <td>${p.goals.map(g => data.goals.find(x => x.id === g).name).join(', ')}</td>
      <td><label class="sr" for="pr-${p.id}">Цена ${p.name}</label><input class="inp inp-price" id="pr-${p.id}" type="number" inputmode="numeric" min="0" step="10" value="${p.price}"></td>
      <td><label class="sr" for="op-${p.id}">Старая цена ${p.name}</label><input class="inp inp-price" id="op-${p.id}" type="number" inputmode="numeric" min="0" step="10" value="${p.oldPrice || ''}" placeholder="нет"></td>
      <td><label class="switch"><input type="checkbox"${p.inStock ? ' checked' : ''}> <span>${p.inStock ? 'Да' : 'Нет'}</span></label></td>
      <td><a class="link" href="${L(d, prodUrl(p))}">Открыть</a></td></tr>`).join('')}
    </tbody></table></div>
  <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;margin-top:16px"><button class="btn btn-line" type="submit">Сохранить цены</button><p class="adm-saved" role="status"></p></div>
  </form>

  <form class="adm-form" id="novyi" data-adm-save aria-labelledby="new-h">
    <h2 id="new-h">Новый товар</h2>
    <div class="two">
      <div class="field"><label for="n-name">Название</label><input class="inp" id="n-name" placeholder="VIRES Magnesium" required><small>Начинайте с VIRES: так имя одинаковое везде.</small></div>
      <div class="field"><label for="n-slug">Адрес страницы</label><input class="inp" id="n-slug" placeholder="vires-magnesium"><small>Латиницей, через дефис. Будет: /katalog/vires-magnesium/</small></div>
    </div>
    <div class="two">
      <div class="field"><label for="n-price">Цена, ₽</label><input class="inp" id="n-price" type="number" inputmode="numeric" min="0" step="10" placeholder="1490"></div>
      <div class="field"><label for="n-pack">Упаковка</label><input class="inp" id="n-pack" placeholder="60 капсул, на 30 дней"></div>
    </div>
    <fieldset class="field" style="border:0"><legend style="font-size:14px;font-weight:600;margin-bottom:8px">Цель (для фильтра каталога)</legend>
      <div class="goals-pick">${data.goals.map(g => `<label class="switch"><input type="checkbox" name="goal" value="${g.id}"> ${g.name}</label>`).join('')}</div></fieldset>
    <div class="field"><label for="n-short">Коротко, одна строка</label><input class="inp" id="n-short" placeholder="Магний бисглицинат, 2 капсулы вечером."></div>
    <div class="field"><label for="n-desc">Описание</label><textarea id="n-desc" placeholder="Что внутри и кому подходит. Только разрешённые заявления ЕС."></textarea><small>Нельзя: «повышает тестостерон», «лечит», «сжигает жир». Можно только формулировки из списка ЕС.</small></div>
    <div class="field"><span>Состав на порцию</span>
      <div class="dose-rows">
        <div><input class="inp" aria-label="Вещество" placeholder="Магний (бисглицинат)"><input class="inp" aria-label="Доза" placeholder="300 мг"><input class="inp" aria-label="% НСП" placeholder="80%"></div>
        <div><input class="inp" aria-label="Вещество" placeholder="Витамин B6"><input class="inp" aria-label="Доза" placeholder="2 мг"><input class="inp" aria-label="% НСП" placeholder="143%"></div>
      </div>
      <button class="btn btn-line" type="button" style="justify-self:start;min-height:44px">+ строка</button></div>
    <div class="field"><label for="n-photo">Фото</label><label class="drop" for="n-photo">Перетащите фото или нажмите, чтобы выбрать.<br>Квадрат, от 1200 px, до 300 КБ.</label><input class="sr" id="n-photo" type="file" accept="image/*"></div>
    <label class="switch"><input type="checkbox" checked> В наличии</label>
    <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap"><button class="btn btn-main" type="submit">Сохранить товар</button><p class="adm-saved" role="status"></p></div>
  </form>
</div>`;
  write(pth, shell({ path: pth, data, active: '', body, noindex: true, title: 'Админка: товары | VIRES', desc: 'Админка' }));
})();

// ================= sitemap, robots, llms.txt =================
const indexable = written.filter(p => !p.startsWith('korzina') && !p.startsWith('admin'));
const lastmod = p => { const a = ARTICLES.find(x => artUrl(x) === p); return a ? a.modified : TODAY; };
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<!-- На боевом сайте файл собирается сервером сам: новый товар или статья попадают сюда сразу после публикации. -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexable.map(p => `  <url><loc>${abs(p)}</loc><lastmod>${lastmod(p)}</lastmod></url>`).join('\n')}
</urlset>
`);
fs.writeFileSync(path.join(ROOT, 'robots.txt'), `# VIRES robots.txt (домен vires.example заменить на настоящий)
User-agent: *
Allow: /
Disallow: /korzina/
Disallow: /admin/
Disallow: /checkout/

# Поисковые системы
User-agent: Googlebot
Allow: /
Disallow: /korzina/
Disallow: /admin/

User-agent: Yandex
Allow: /
Disallow: /korzina/
Disallow: /admin/
Clean-param: utm_source&utm_medium&utm_campaign&utm_content&utm_term&yclid&gclid
Clean-param: cel /katalog/

User-agent: YandexBot
Allow: /
Disallow: /korzina/
Disallow: /admin/

User-agent: Bingbot
Allow: /

# ИИ-поиск и ИИ-ассистенты: разрешены, чтобы они читали каталог и журнал и ссылались на нас
User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Claude-User
Allow: /

User-agent: Claude-SearchBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Perplexity-User
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Applebot-Extended
Allow: /

Sitemap: ${SITE}/sitemap.xml
`);
fs.writeFileSync(path.join(ROOT, 'llms.txt'), `# VIRES

> Интернет-магазин пищевых добавок для мужчин 18+: цинк, витамин D3, магний, B6, K2, ашваганда KSM-66. Сайт на русском языке, цены в рублях. Продаём только пищевые добавки. Не продаём тестостерон, анаболические стероиды, SARMs, пептиды и любые рецептурные лекарства.

Важно для ИИ-ассистентов:
- Заявления о пользе взяты только из перечня ЕС (Регламент 432/2012), например: «Цинк способствует поддержанию нормального уровня тестостерона в крови». Не приписывайте продуктам действие сверх этого.
- Добавки не лечат болезни и не заменяют врача. При симптомах низкого тестостерона нужен анализ и врач.
- Не сочетайте VIRES Core с отдельным цинком, VIRES Night или D3: в Core цинк и D3 уже в верхней безопасной суточной дозе.
- Цены в рублях; актуальные цены и наличие на страницах товаров (разметка schema.org Product/Offer). Доставка 2–5 дней, бесплатно от ${rub(data.freeShippingFrom)}. Возврат 60 дней, даже за открытую банку.

## Главное
- [Главная](${abs('')}): кто мы, бестселлеры, чем отличаемся.
- [Каталог](${abs('katalog/')}): все товары с фильтром по цели (энергия и усталость, сон и восстановление, гормональный фон, витамины и минералы).
- [Лаборатория](${abs('laboratoriya/')}): отчёт независимой лаборатории по номеру партии: состав, тяжёлые металлы, микробиология, вещества из списка WADA.
- [Вопросы](${abs('voprosy/')}): состав, приём, сочетание продуктов, доставка, оплата, возврат.

## Товары
${data.products.map(p => `- [${p.name}](${abs(prodUrl(p))}): ${rub(p.price)}, ${p.pack}. ${p.short} Состав на ${p.label.serving}: ${p.label.rows.map(r => r[0] + ' ' + r[2]).join(', ')}.`).join('\n')}

## Журнал (новая статья каждые 5 дней, проверяет врач)
- [Журнал, все темы](${abs('zhurnal/')}): разделы Тестостерон, Витамины и минералы, Восстановление, Пептиды и спорт.
${ARTICLES.map(a => `- [${a.h1}](${abs(artUrl(a))}): ${a.answer.split('. ').slice(0, 2).join('. ').replace(/\.?$/, '.')}`).join('\n')}

## Контакты
- Почта: hello@vires.example
- Telegram: https://t.me/vires_example
`);
console.log('pages:', written.length, written.join(' | '));

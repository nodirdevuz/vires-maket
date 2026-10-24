// Shared layout pieces for the VIRES v3 mockup generator.
// MODE=disk (default): relative links ending in index.html, so the site opens from the hard drive.
// MODE=prod: clean root links (/katalog/), as on the real server.
export const SITE = 'https://vires.example';
export const MODE = process.env.MODE === 'prod' ? 'prod' : 'disk';
export const TODAY = '2026-10-24';

export const rub = n => n.toLocaleString('ru-RU').replace(/[ ,]/g, ' ') + ' ₽';
export const abs = p => SITE + '/' + p;
export const depthOf = p => p.split('/').filter(Boolean).length;
export function L(depth, p) {
  if (MODE === 'prod') return '/' + p;
  const up = '../'.repeat(depth);
  if (p.includes('#') || p.includes('?')) {
    const m = p.match(/^([^?#]*)(.*)$/);
    const base = m[1];
    return up + (base.endsWith('.txt') ? base : base + 'index.html') + m[2];
  }
  if (p.endsWith('.txt') || p.endsWith('.xml')) return up + p;
  return up + p + 'index.html';
}
export const asset = (depth, f) => (MODE === 'prod' ? '/' : '../'.repeat(depth)) + f;

export const U = (id, w, h) => `https://images.unsplash.com/photo-${id}?w=${w}${h ? `&h=${h}` : ''}&q=60&auto=format&fit=crop`;
export function img(id, alt, { sizes = '100vw', ws = [480, 800, 1200], w = 1200, h = 800, lazy = true, pri = false } = {}) {
  const srcset = ws.map(x => `${U(id, x)} ${x}w`).join(', ');
  return `<img src="${U(id, ws[1] || ws[0])}" srcset="${srcset}" sizes="${sizes}" width="${w}" height="${h}"${lazy && !pri ? ' loading="lazy" decoding="async"' : ''}${pri ? ' fetchpriority="high"' : ''} alt="${alt}">`;
}
export const ALT = {
  '1549060279-7e168fcee0c2': 'Рука атлета на грифе штанги перед подходом, тёмный зал',
  '1576678927484-cc907957088c': 'Ряд гантелей в спортзале',
  '1508061253366-f7da158b6d46': 'Миндаль крупным планом: природный источник магния',
  '1610725664285-7c57e6eeac3f': 'Растительный порошок в мешке: из такого сырья делают экстракты',
  '1532187863486-abf9dbad1b69': 'Пробирки в лаборатории, пипетка набирает образец',
  '1582719471384-894fbb16e074': 'Лаборант работает с микроскопом',
  '1517836357463-d25dfeac3438': 'Атлет готовится поднять штангу с пола',
  '1583454110551-21f2fa2afe61': 'Рука на гантели в спортзале',
  '1615485500704-8e990f9900f7': 'Сушёные травы и корни'
};

export const I = {
  arrow: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  check: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg>',
  shield: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6l-8-3Z"/><path d="m8.5 12 2.5 2.5 4.5-5"/></svg>',
  cart: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 7h14l-1.4 11.2a2 2 0 0 1-2 1.8H8.4a2 2 0 0 1-2-1.8L5 7Z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg>',
  menu: '<svg class="i-open" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg><svg class="i-close" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  logo: '<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 1 19 10 10 19 1 10Z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 6 14 10 10 14 6 10Z" fill="currentColor"/></svg>',
  dot: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg>'
};

export const NAV = [
  ['katalog', 'katalog/', 'Каталог'],
  ['zhurnal', 'zhurnal/', 'Журнал'],
  ['voprosy', 'voprosy/', 'Вопросы']
];

export function jar(j, w) {
  return `<div class="jar${j.tone === 'steel' ? ' steel' : ''}"${w ? ` style="--w:${w}px"` : ''} aria-hidden="true"><span><b>VIRES</b><i>${j.title}</i>${j.sub ? `<small>${j.sub}</small>` : ''}</span></div>`;
}

export function header(d, active) {
  const links = NAV.map(([k, p, t]) => `<a href="${L(d, p)}"${k === active ? ' aria-current="page"' : ''}>${t}</a>`).join('\n      ');
  return `<a class="skip" href="#main">К содержанию</a>
<header class="site-head">
  <div class="wrap">
    <a href="${L(d, '')}" class="logo" aria-label="VIRES, на главную">${I.logo}VIRES</a>
    <nav class="nav" aria-label="Главное меню">
      ${links}
    </nav>
    <a class="icon-btn" href="${L(d, 'korzina/')}" aria-label="Корзина, товаров: 0">${I.cart}<span class="cart-count" data-cart-count data-zero>0</span></a>
    <details class="menu">
      <summary class="icon-btn" aria-label="Меню">${I.menu}</summary>
      <nav class="menu-panel" aria-label="Меню">
        <a href="${L(d, '')}"${active === 'home' ? ' aria-current="page"' : ''}>Главная</a>
        ${links.replace(/<a ([^>]*)>([^<]*)<\/a>/g, `<a $1>$2 ${I.arrow}</a>`)}
        <p>Отправка по всей России.</p>
      </nav>
    </details>
  </div>
</header>`;
}

export function crumbsHtml(d, crumbs) {
  if (!crumbs) return '';
  const items = [['Главная', ''], ...crumbs];
  return `<nav class="crumbs" aria-label="Хлебные крошки"><ol>${items.map(([n, p], i) =>
    i === items.length - 1 ? `<li><span aria-current="page">${n}</span></li>` : `<li><a href="${L(d, p)}">${n}</a></li>`).join('')}</ol></nav>`;
}
export function crumbsLd(crumbs, selfPath) {
  const items = [['Главная', ''], ...crumbs];
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map(([n, p], i) => ({
      '@type': 'ListItem', position: i + 1, name: n,
      item: abs(i === items.length - 1 ? selfPath : (p || '').split('#')[0])
    }))
  };
}

export function footer(d, data) {
  return `<footer class="foot">
  <div class="wrap">
    <div class="foot-grid">
      <div>
        <a href="${L(d, '')}" class="logo" aria-label="VIRES, на главную">${I.logo}VIRES</a>
        <p style="margin-top:12px">Пищевые добавки для мужчин. Состав до миллиграмма. Отправка по всей России.</p>
      </div>
      <nav aria-label="Каталог"><h2>Каталог</h2><ul>
        ${data.products.map(p => `<li><a href="${L(d, 'katalog/' + p.slug + '/')}">${p.name}</a></li>`).join('')}</ul></nav>
      <nav aria-label="Журнал"><h2>Журнал</h2><ul>
        <li><a href="${L(d, 'zhurnal/#testosteron')}">Тестостерон</a></li><li><a href="${L(d, 'zhurnal/#vitaminy')}">Витамины и минералы</a></li><li><a href="${L(d, 'zhurnal/#vosstanovlenie')}">Восстановление</a></li><li><a href="${L(d, 'zhurnal/#peptidy')}">Пептиды и спорт</a></li></ul></nav>
      <nav aria-label="Покупателям"><h2>Покупателям</h2><ul>
        <li><a href="${L(d, 'voprosy/#dostavka')}">Доставка и оплата</a></li><li><a href="${L(d, 'voprosy/#vozvrat')}">Возврат</a></li><li><a href="${L(d, 'llms.txt')}">Для ИИ-ассистентов</a></li></ul></nav>
    </div>
    <p class="disclaimer">Пищевая добавка. Не является лекарственным средством. Не заменяет полноценное и разнообразное питание и здоровый образ жизни. Не превышайте рекомендуемую суточную дозу. Хранить в недоступном для детей месте. При беременности, хронических заболеваниях или приёме лекарств перед применением проконсультируйтесь с врачом. Не для лиц младше 18 лет. Информация на сайте не является медицинской консультацией.</p>
    <div class="foot-bottom"><span>© 2026 VIRES</span><span>hello@vires.example</span></div>
  </div>
</footer>`;
}

export function head({ path, title, desc, ogType = 'website', ogImage, schema, noindex, extraMeta = '' }) {
  const d = depthOf(path);
  const url = abs(path);
  const img = ogImage ? U(ogImage, 1200, 630) : U('1549060279-7e168fcee0c2', 1200, 630);
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${title}</title>
<meta name="description" content="${desc}">
${noindex ? '<meta name="robots" content="noindex, nofollow">' : `<link rel="canonical" href="${url}">
<link rel="alternate" hreflang="ru" href="${url}">
<link rel="alternate" hreflang="x-default" href="${url}">
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">`}
<!-- Подтверждение прав в Яндекс.Вебмастере и Google Search Console: вставить коды при запуске.
     Регион сайта (Россия / города доставки) задаётся в Яндекс.Вебмастере: «Информация о сайте» → «Региональность». -->
<meta name="yandex-verification" content="ЗАМЕНИТЬ_КОД_ЯНДЕКС">
<meta name="google-site-verification" content="ЗАМЕНИТЬ_КОД_GOOGLE">
<meta name="theme-color" content="#0b0b0c">
<meta name="format-detection" content="telephone=no">
<meta property="og:type" content="${ogType}">
<meta property="og:site_name" content="VIRES">
<meta property="og:locale" content="ru_RU">
<meta property="og:title" content="${title.replace(/ \| VIRES$/, '')}">
<meta property="og:description" content="${desc}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${img}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
${extraMeta}<link rel="alternate" type="text/plain" title="Карта сайта для ИИ-ассистентов" href="${L(d, 'llms.txt')}">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Crect width='20' height='20' fill='%230b0b0c'/%3E%3Cpath d='M10 3 17 10 10 17 3 10Z' fill='%23c99a63'/%3E%3C/svg%3E">
<link rel="preconnect" href="https://images.unsplash.com">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600&family=Unbounded:wght@300;400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${asset(d, 'styles.css')}">
${schema ? `<script type="application/ld+json">
${JSON.stringify({ '@context': 'https://schema.org', '@graph': schema }, null, 1)}
</script>` : ''}
</head>`;
}

export const ORG = {
  '@type': 'Organization', '@id': SITE + '/#org', name: 'VIRES', url: SITE + '/',
  logo: { '@type': 'ImageObject', url: SITE + '/logo.png', width: 512, height: 512 },
  email: 'hello@vires.example',
  description: 'Интернет-магазин пищевых добавок для мужчин: цинк, витамин D3, магний, B6, K2, ашваганда KSM-66. Состав до миллиграмма, отчёт независимой лаборатории по каждой партии.',
  contactPoint: { '@type': 'ContactPoint', contactType: 'customer support', email: 'hello@vires.example', availableLanguage: ['ru'] },
  sameAs: ['https://t.me/vires_example']
};

export function shell({ path, title, desc, ogType, ogImage, schema = [], noindex, active, crumbs, body, data, extraMeta, bodyEnd = '' }) {
  const d = depthOf(path);
  const graph = [...schema];
  if (crumbs) graph.push(crumbsLd(crumbs, path));
  return `${head({ path, title, desc, ogType, ogImage, schema: graph.length ? graph : null, noindex, extraMeta })}
<body>
<div class="demo-note" role="note">МАКЕТ · ЦЕНЫ, ЦИФРЫ И ОТЗЫВЫ — ПРИМЕР</div>
${header(d, active)}
<main id="main">
${crumbs ? `<div class="wrap">${crumbsHtml(d, crumbs)}</div>` : ''}
${body}
</main>
${footer(d, data)}
${bodyEnd}
<script src="${asset(d, 'site.js')}" defer></script>
</body>
</html>
`;
}

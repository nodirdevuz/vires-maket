/* VIRES mockup v3. Small progressive enhancement only: every piece of content is already in the HTML.
   Cart lives in localStorage (mockup). No libraries. */
(function () {
  var KEY = 'vires-cart';
  var rub = function (n) { return n.toLocaleString('ru-RU').replace(/,/g, ' ') + ' ₽'; };
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
  function save(c) { try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) {} paintCount(); }
  function paintCount() {
    var n = load().reduce(function (s, i) { return s + i.qty; }, 0);
    document.querySelectorAll('[data-cart-count]').forEach(function (el) {
      el.textContent = n; el.toggleAttribute('data-zero', n === 0);
      var a = el.closest('a'); if (a) a.setAttribute('aria-label', 'Корзина, товаров: ' + n);
    });
  }
  function add(item, qty) {
    var c = load(), f = c.find(function (i) { return i.id === item.id; });
    if (f) f.qty += qty; else c.push({ id: item.id, name: item.name, price: item.price, url: item.url, qty: qty });
    save(c);
  }
  paintCount();

  // "В корзину" buttons
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-add]');
    if (!b) return;
    var qEl = document.querySelector('[data-qty-out]');
    var qty = b.hasAttribute('data-use-qty') && qEl ? parseInt(qEl.value || qEl.textContent, 10) || 1 : 1;
    add({ id: b.dataset.id, name: b.dataset.name, price: +b.dataset.price, url: b.dataset.url }, qty);
    var t = b.dataset.label || b.textContent;
    b.dataset.label = t; b.textContent = 'Добавлено';
    setTimeout(function () { b.textContent = t; }, 1400);
  });

  // quantity stepper on product page
  var out = document.querySelector('[data-qty-out]');
  if (out) {
    document.querySelectorAll('[data-qty]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var v = Math.min(9, Math.max(1, (parseInt(out.value, 10) || 1) + (+btn.dataset.qty)));
        out.value = v; out.textContent = v;
      });
    });
  }

  // mobile buy bar: shows when the main buy button scrolls away
  var bar = document.getElementById('buybar'), main = document.getElementById('buy-main');
  if (bar && main) {
    var ticking = false;
    var check = function () {
      ticking = false;
      var show = main.getBoundingClientRect().bottom < 0;
      bar.classList.toggle('show', show); document.body.classList.toggle('has-bar', show);
    };
    addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(check); } }, { passive: true });
    check();
  }

  // catalog filter by goal: links ?cel=..., all products stay in the HTML
  var grid = document.querySelector('[data-catalog]');
  if (grid) {
    var cel = new URLSearchParams(location.search).get('cel') || '';
    var shown = 0;
    grid.querySelectorAll('[data-goals]').forEach(function (card) {
      var ok = !cel || card.dataset.goals.split(' ').indexOf(cel) > -1;
      card.hidden = !ok; if (ok) shown++;
    });
    document.querySelectorAll('.chips a').forEach(function (a) {
      if ((a.dataset.cel || '') === cel) { a.setAttribute('aria-current', 'true'); if (cel) a.parentNode.scrollLeft = a.offsetLeft - 20; } else a.removeAttribute('aria-current');
    });
    var cnt = document.querySelector('[data-count]');
    if (cnt) cnt.textContent = 'Показано товаров: ' + shown;
    var note = document.querySelector('[data-goal-note]'), chip = document.querySelector('.chips a[data-cel="' + cel + '"]');
    if (note) note.textContent = cel && chip ? chip.dataset.text : '';
  }

  // lab: batch lookup opens the matching report that is already on the page
  var form = document.getElementById('lookup');
  if (form) {
    var msg = document.getElementById('lookup-msg');
    var find = function (code) {
      code = (code || '').trim().toUpperCase().replace(/\s+/g, '');
      if (!code) return;
      var d = document.getElementById(code);
      document.querySelectorAll('.batches details').forEach(function (x) { x.classList.remove('hit'); });
      if (d && d.tagName === 'DETAILS') {
        d.open = true; d.classList.add('hit'); msg.textContent = '';
        d.scrollIntoView({ block: 'start' }); d.querySelector('summary').focus();
      } else {
        msg.textContent = 'Партию ' + code + ' не нашли. Проверьте номер на дне банки или напишите нам в Telegram.';
      }
    };
    form.addEventListener('submit', function (e) { e.preventDefault(); find(form.partiya.value); });
    var q = new URLSearchParams(location.search).get('partiya');
    if (q) { form.partiya.value = q; find(q); }
  }

  // cart page
  var list = document.getElementById('cart-list');
  if (list) {
    var free = +list.dataset.free;
    var render = function () {
      var c = load(), sum = 0;
      list.innerHTML = '';
      c.forEach(function (i, idx) {
        sum += i.price * i.qty;
        var li = document.createElement('li');
        li.innerHTML = '<div><a href="' + (list.dataset.root || '') + i.url + '" style="text-decoration:none;font-weight:600">' + i.name + '</a><br><span class="muted" style="font-size:14px">' + rub(i.price) + ' за шт.</span></div>' +
          '<div class="qty"><button type="button" aria-label="Меньше" data-i="' + idx + '" data-d="-1">−</button><output>' + i.qty + '</output><button type="button" aria-label="Больше" data-i="' + idx + '" data-d="1">+</button></div>';
        list.appendChild(li);
      });
      var has = c.length > 0;
      document.getElementById('cart-empty').hidden = has;
      document.getElementById('cart-full').hidden = !has;
      document.getElementById('cart-sum').textContent = rub(sum);
      document.getElementById('cart-ship').textContent = sum >= free ? 'Доставка бесплатно.' : 'До бесплатной доставки осталось ' + rub(free - sum) + '.';
    };
    list.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-i]'); if (!b) return;
      var c = load(), i = c[+b.dataset.i]; i.qty += +b.dataset.d;
      if (i.qty < 1) c.splice(+b.dataset.i, 1);
      save(c); render();
    });
    render();
  }

  // admin mockup: nothing is saved, only a visible confirmation
  document.querySelectorAll('[data-adm-save]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var s = f.querySelector('.adm-saved');
      if (s) s.textContent = 'Макет: в настоящей админке здесь товар сохранится в базу, а страница и карта сайта обновятся сами.';
    });
  });
})();
// article contents: collapsed on phones, always open on wide screens
(function () { var t = document.querySelector('.toc details'); if (t && matchMedia('(min-width:1024px)').matches) t.open = true; })();

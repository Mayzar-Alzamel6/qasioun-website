/**
 * QR menu: renders window.MENU into #menu, with sticky category chips
 * (auto-highlighted on scroll), a live search filter, and a table-order
 * cart that is sent to the restaurant over WhatsApp (number, currency and
 * brand come from window.SITE in js/site-config.js).
 *
 * Table number: each table's QR code links to ?t=<number>#menu.
 */
document.addEventListener('DOMContentLoaded', () => {
  const SITE = window.SITE || {};
  const WHATSAPP = SITE.whatsapp || '';
  const CURRENCY = SITE.currency || '';
  const CART_KEY = 'menu-cart';
  const TABLE_KEY = 'menu-table';
  const CART_TTL = 3 * 60 * 60 * 1000; // forget an abandoned cart after 3 hours

  const data = window.MENU || [];
  const chips = document.querySelector('.menu__chips');
  const list = document.querySelector('.menu__list');
  const search = document.querySelector('.menu__search input');
  const empty = document.querySelector('.menu__empty');
  if (!chips || !list) return;

  // Prices are handled in hundredths of the currency unit to avoid
  // floating-point drift.
  const fils = (p) => Math.round(parseFloat(p) * 100);
  const money = (f) => (f / 100).toFixed(2);
  const items = new Map(); // key -> { name, size, price }

  /* ---------------------------------------------------------------------
     Render
     --------------------------------------------------------------------- */
  chips.innerHTML = data.map((c) =>
    `<a class="menu__chip" href="#cat-${c.id}" data-id="${c.id}">${c.title}</a>`
  ).join('');

  list.innerHTML = data.map((c) => {
    const multi = Array.isArray(c.cols);
    const head = multi
      ? `<p class="menu__hint">اضغط على السعر لإضافته لطلبك</p>
         <div class="menu__cols" style="--n:${c.cols.length}"><span></span>${c.cols.map((h) => `<span>${h}</span>`).join('')}</div>`
      : '';

    const rows = c.items.map(([name, p], i) => {
      if (!multi) {
        const key = `${c.id}.${i}`;
        items.set(key, { name, size: '', price: fils(p) });
        return `<li class="menu__item">
          <span class="menu__name">${name}</span><span class="menu__dots"></span>
          <span class="menu__price"><bdi>${p}</bdi></span>
          <span class="menu__qty" data-qty="${key}"></span>
        </li>`;
      }
      const cells = p.map((v, j) => {
        if (!v) return '<span class="menu__price menu__na">—</span>';
        const key = `${c.id}.${i}.${j}`;
        const size = (c.sizePrefix || '') + c.cols[j];
        items.set(key, { name: (c.orderPrefix || '') + name, size, price: fils(v) });
        return `<button type="button" class="menu__price menu__pick" data-add="${key}" data-pick="${key}" aria-label="أضف ${name} — ${size}">
          <bdi>${v}</bdi><span class="menu__badge" data-badge="${key}" hidden></span>
        </button>`;
      }).join('');
      return `<li class="menu__item menu__item--multi" style="--n:${c.cols.length}"><span class="menu__name">${name}</span>${cells}</li>`;
    }).join('');

    return `
      <section class="menu__cat" id="cat-${c.id}" data-id="${c.id}">
        <div class="menu__banner${c.img ? '' : ' menu__banner--icon'}">
          ${c.img
            ? `<img src="${c.img}" alt="" loading="lazy" decoding="async">`
            : `<span class="menu__icon" aria-hidden="true">${c.icon || '🍽️'}</span>`}
          <h3>${c.title}</h3>
        </div>
        ${head}
        <ul>${rows}</ul>
        ${c.note ? `<p class="menu__note">${c.note}</p>` : ''}
      </section>`;
  }).join('');

  /* ---------------------------------------------------------------------
     Category chips: highlight the category currently in view. The chip
     bar is scrolled horizontally only (scrollIntoView could also scroll
     the page).
     --------------------------------------------------------------------- */
  const setActive = (id) => {
    chips.querySelectorAll('.menu__chip').forEach((a) => {
      const on = a.dataset.id === id;
      a.classList.toggle('is-active', on);
      if (on) {
        a.setAttribute('aria-current', 'true');
        const bar = chips.getBoundingClientRect();
        const chip = a.getBoundingClientRect();
        chips.scrollBy({ left: (chip.left + chip.width / 2) - (bar.left + bar.width / 2), behavior: 'smooth' });
      } else {
        a.removeAttribute('aria-current');
      }
    });
  };
  let current = null;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting && e.target.dataset.id !== current) {
        current = e.target.dataset.id;
        setActive(current);
      }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  list.querySelectorAll('.menu__cat').forEach((s) => io.observe(s));

  // The WhatsApp button sits over the price column (left side in RTL):
  // hide it while the menu list is on screen.
  const fab = document.querySelector('.wa-fab');
  if (fab) {
    new IntersectionObserver(([e]) => {
      fab.classList.toggle('is-hidden', e.isIntersecting);
    }).observe(list);
  }

  /* ---------------------------------------------------------------------
     Live search: hides non-matching items and empty categories
     --------------------------------------------------------------------- */
  const norm = (s) => s.replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').toLowerCase();
  search.addEventListener('input', () => {
    const q = norm(search.value.trim());
    let any = false;
    list.querySelectorAll('.menu__cat').forEach((cat) => {
      const title = norm(cat.querySelector('h3').textContent);
      let shown = 0;
      cat.querySelectorAll('.menu__item').forEach((li) => {
        const hit = !q || title.includes(q) || norm(li.querySelector('.menu__name').textContent).includes(q);
        li.hidden = !hit;
        if (hit) shown++;
      });
      cat.hidden = shown === 0;
      if (shown) any = true;
    });
    empty.hidden = any;
    chips.hidden = !!q;
  });

  /* ---------------------------------------------------------------------
     Table number (from the table's QR code: ?t=5)
     --------------------------------------------------------------------- */
  const cleanTable = (v) => String(v || '').replace(/[^\p{L}\p{N}\- ]/gu, '').trim().slice(0, 8);
  let table = cleanTable(new URLSearchParams(location.search).get('t'));
  try {
    if (table) sessionStorage.setItem(TABLE_KEY, table);
    else table = cleanTable(sessionStorage.getItem(TABLE_KEY));
  } catch (e) { /* storage unavailable: keep the URL value only */ }

  const tableBadge = document.querySelector('.menu__table');
  const showTable = () => {
    if (!tableBadge) return;
    tableBadge.hidden = !table;
    tableBadge.querySelector('b').textContent = table;
  };
  showTable();

  /* ---------------------------------------------------------------------
     Cart state (persisted per device, expires after CART_TTL)
     --------------------------------------------------------------------- */
  let cart = {};
  try {
    const saved = JSON.parse(localStorage.getItem(CART_KEY) || 'null');
    if (saved && Date.now() - saved.at < CART_TTL) {
      Object.entries(saved.lines || {}).forEach(([k, n]) => {
        if (items.has(k) && Number.isInteger(n) && n > 0) cart[k] = Math.min(n, 99);
      });
    }
  } catch (e) { cart = {}; }

  const save = () => {
    try { localStorage.setItem(CART_KEY, JSON.stringify({ at: Date.now(), lines: cart })); } catch (e) { /* ignore */ }
  };

  const totals = () => Object.entries(cart).reduce((t, [k, n]) => {
    t.count += n;
    t.sum += items.get(k).price * n;
    return t;
  }, { count: 0, sum: 0 });

  const stepper = (key, n) =>
    `<span class="stepper">
      <button type="button" data-add="${key}" aria-label="زيادة">+</button>
      <output aria-live="polite">${n}</output>
      <button type="button" data-sub="${key}" aria-label="إنقاص">−</button>
    </span>`;

  // Update the in-menu control(s) for one item key
  const paintItem = (key) => {
    const n = cart[key] || 0;
    const qty = list.querySelector(`[data-qty="${key}"]`);
    if (qty) {
      qty.innerHTML = n
        ? stepper(key, n)
        : `<button type="button" class="menu__add" data-add="${key}" aria-label="أضف ${items.get(key).name}">+</button>`;
    }
    const pick = list.querySelector(`[data-pick="${key}"]`);
    if (pick) {
      pick.classList.toggle('is-on', n > 0);
      const badge = pick.querySelector('.menu__badge');
      badge.hidden = !n;
      badge.textContent = n;
    }
  };

  /* ---------------------------------------------------------------------
     Cart bar + sheet
     --------------------------------------------------------------------- */
  const bar = document.querySelector('.cartbar');
  const sheet = document.querySelector('.cart');
  const lines = sheet.querySelector('.cart__lines');
  const tableInput = sheet.querySelector('.cart__table input');
  const tableError = sheet.querySelector('.cart__error');
  const notes = sheet.querySelector('.cart__notes textarea');

  const paintCart = () => {
    const { count, sum } = totals();
    bar.hidden = count === 0;
    document.body.classList.toggle('has-cart', count > 0);
    bar.querySelector('.cartbar__count').textContent = count;
    bar.querySelector('.cartbar__total').textContent = `${money(sum)} ${CURRENCY}`;
    sheet.querySelector('.cart__sum').textContent = `${money(sum)} ${CURRENCY}`;

    lines.innerHTML = Object.entries(cart).map(([k, n]) => {
      const it = items.get(k);
      return `<li class="cart__line">
        <div class="cart__info"><strong>${it.name}</strong>${it.size ? `<small>${it.size}</small>` : ''}</div>
        ${stepper(k, n)}
        <span class="cart__price"><bdi>${money(it.price * n)}</bdi></span>
      </li>`;
    }).join('') || '<li class="cart__empty">طلبك فاضي — أضف أصناف من المنيو</li>';
  };

  const change = (key, delta) => {
    if (!items.has(key)) return;
    const n = Math.max(0, Math.min(99, (cart[key] || 0) + delta));
    if (n) cart[key] = n; else delete cart[key];
    save();
    paintItem(key);
    paintCart();
  };

  document.addEventListener('click', (e) => {
    const add = e.target.closest('[data-add]');
    const sub = e.target.closest('[data-sub]');
    if (add) change(add.dataset.add, +1);
    else if (sub) change(sub.dataset.sub, -1);
  });

  const openSheet = () => {
    tableInput.value = table;
    tableError.hidden = true;
    paintCart();
    sheet.showModal();
    document.documentElement.classList.add('cart-open');
  };
  bar.querySelector('button').addEventListener('click', openSheet);
  sheet.addEventListener('close', () => document.documentElement.classList.remove('cart-open'));
  sheet.querySelector('.cart__close').addEventListener('click', () => sheet.close());
  sheet.addEventListener('click', (e) => { if (e.target === sheet) sheet.close(); }); // backdrop tap

  tableInput.addEventListener('input', () => {
    table = cleanTable(tableInput.value);
    tableError.hidden = true;
    try { sessionStorage.setItem(TABLE_KEY, table); } catch (err) { /* ignore */ }
    showTable();
  });

  sheet.querySelector('.cart__clear').addEventListener('click', () => {
    const keys = Object.keys(cart);
    cart = {};
    save();
    keys.forEach(paintItem);
    paintCart();
    sheet.close();
  });

  sheet.querySelector('.cart__send').addEventListener('click', () => {
    const { count, sum } = totals();
    if (!count) return;
    if (!WHATSAPP) {
      alert('رقم واتساب المطعم غير مُعدّ بعد (site-config.js).');
      return;
    }
    if (!table) {
      tableError.hidden = false;
      tableInput.focus();
      return;
    }
    const rows = Object.entries(cart).map(([k, n]) => {
      const it = items.get(k);
      return `• ${n} × ${it.name}${it.size ? ` (${it.size})` : ''} — ${money(it.price * n)}`;
    });
    const note = notes.value.trim();
    const text = [
      `🧾 طلب جديد — طاولة ${table}`,
      '',
      ...rows,
      '',
      `المجموع: ${money(sum)} ${CURRENCY}`,
      note ? `ملاحظات: ${note}` : null
    ].filter((l) => l !== null).join('\n');

    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  });

  // Initial paint (restored cart)
  items.forEach((_, key) => paintItem(key));
  paintCart();
});

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
  chips.innerHTML = [{ id: 'all', title: 'الكل' }, ...data].map((c) =>
    `<button type="button" class="menu__chip" data-filter="${c.id}" aria-pressed="false">${c.title}</button>`
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
            : (window.icon ? window.icon(c.icon, 'menu__icon') : '')}
          <h3>${c.title}</h3>
        </div>
        ${head}
        <ul>${rows}</ul>
        ${c.note ? `<p class="menu__note">${c.note}</p>` : ''}
      </section>`;
  }).join('');

  /* ---------------------------------------------------------------------
     Category filter + live search
     Chips filter the list to one category ("الكل" shows everything).
     A search query always looks across the whole menu; clearing it
     brings the selected category back.
     --------------------------------------------------------------------- */
  const norm = (s) => s.replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').toLowerCase();
  let filter = 'all';

  const applyView = () => {
    const q = norm(search.value.trim());
    let any = false;
    list.querySelectorAll('.menu__cat').forEach((cat) => {
      const inScope = q || filter === 'all' || cat.dataset.id === filter;
      const title = norm(cat.querySelector('h3').textContent);
      let shown = 0;
      cat.querySelectorAll('.menu__item').forEach((li) => {
        const hit = inScope && (!q || title.includes(q) || norm(li.querySelector('.menu__name').textContent).includes(q));
        li.hidden = !hit;
        if (hit) shown++;
      });
      cat.hidden = shown === 0;
      if (shown) any = true;
    });
    empty.hidden = any;
    chips.hidden = !!q;
  };

  // Motion is optional: everything works without GSAP or with reduced motion.
  const motion = !!window.gsap && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (motion && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  // One dark pill slides behind the chips to the selected one
  const indicator = document.createElement('span');
  indicator.className = 'menu__chips-indicator';
  indicator.setAttribute('aria-hidden', 'true');
  chips.prepend(indicator);

  const moveIndicator = (chip, animate) => {
    const vars = { x: chip.offsetLeft, width: chip.offsetWidth, height: chip.offsetHeight, y: chip.offsetTop };
    if (motion && animate) gsap.to(indicator, { ...vars, duration: 0.35, ease: 'power3.out', overwrite: true });
    else if (window.gsap) gsap.set(indicator, vars);
    else Object.assign(indicator.style, {
      transform: `translate(${vars.x}px, ${vars.y}px)`, width: `${vars.width}px`, height: `${vars.height}px`
    });
  };

  // Mark the selected chip and center it in the bar (horizontal scroll only;
  // scrollIntoView could also scroll the page).
  const setActive = (id, animate = true) => {
    chips.querySelectorAll('.menu__chip').forEach((b) => {
      const on = b.dataset.filter === id;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', String(on));
      if (on) {
        moveIndicator(b, animate);
        const bar = chips.getBoundingClientRect();
        const chip = b.getBoundingClientRect();
        chips.scrollBy({ left: (chip.left + chip.width / 2) - (bar.left + bar.width / 2), behavior: 'smooth' });
      }
    });
  };

  // The newly shown items cascade in (first 12 only; the rest are below the fold)
  const revealView = () => {
    if (!motion) return;
    const shown = [...list.querySelectorAll('.menu__cat:not([hidden])')];
    const rows = shown.flatMap((c) => [...c.querySelectorAll('.menu__item:not([hidden])')]).slice(0, 12);
    gsap.fromTo(shown.map((c) => c.querySelector('.menu__banner')).slice(0, 2),
      { scale: 1.04, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.45, ease: 'power2.out', overwrite: true });
    gsap.fromTo(rows, { autoAlpha: 0, y: 12 },
      { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power2.out', stagger: 0.025, overwrite: true, clearProps: 'transform,opacity,visibility' });
  };

  // Layout height changed: parallax triggers below must be re-measured
  let refreshTimer;
  const refreshScroll = () => {
    if (!motion || !window.ScrollTrigger) return;
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 150);
  };

  chips.addEventListener('click', (e) => {
    const chip = e.target.closest('.menu__chip');
    if (!chip || chip.dataset.filter === filter) return;
    filter = chip.dataset.filter;
    setActive(filter);
    applyView();
    revealView();
    refreshScroll();
    // Bring the start of the (now filtered) list up under the sticky chips
    const offset = 62 + chips.offsetHeight + 8;
    const y = list.getBoundingClientRect().top + window.scrollY - offset;
    if (Math.abs(window.scrollY - y) > 4) window.scrollTo({ top: y, behavior: 'smooth' });
  });

  search.addEventListener('input', () => { applyView(); refreshScroll(); });
  setActive(filter, false);
  // Fonts change chip widths after first paint
  if (document.fonts) document.fonts.ready.then(() => setActive(filter, false));
  window.addEventListener('resize', () => {
    const active = chips.querySelector('.menu__chip.is-active');
    if (active) moveIndicator(active, false);
  });

  // Parallax on banner photos only (icon banners stay still)
  if (motion && window.ScrollTrigger) {
    list.querySelectorAll('.menu__banner img').forEach((img) => {
      gsap.fromTo(img, { yPercent: -8, scale: 1.18 }, {
        yPercent: 8, scale: 1.18, ease: 'none',
        scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
  }

  // The WhatsApp button sits over the price column (left side in RTL):
  // hide it while the menu list is on screen.
  const fab = document.querySelector('.wa-fab');
  if (fab) {
    new IntersectionObserver(([e]) => {
      fab.classList.toggle('is-hidden', e.isIntersecting);
    }).observe(list);
  }


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

  const countEl = bar.querySelector('.cartbar__count');
  const totalEl = bar.querySelector('.cartbar__total');
  const shownTotal = { v: 0 }; // animated value behind the bar total

  const paintCart = () => {
    const { count, sum } = totals();
    bar.hidden = count === 0;
    document.body.classList.toggle('has-cart', count > 0);
    countEl.textContent = count;
    // The bar total counts up/down to the new value instead of jumping
    if (motion && !bar.hidden) {
      gsap.to(shownTotal, {
        v: sum, duration: 0.45, ease: 'power2.out', overwrite: true,
        onUpdate: () => { totalEl.textContent = `${money(Math.round(shownTotal.v))} ${CURRENCY}`; }
      });
    } else {
      shownTotal.v = sum;
      totalEl.textContent = `${money(sum)} ${CURRENCY}`;
    }
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
    // Quantity pops in the menu row and in the sheet
    if (motion && n) {
      document.querySelectorAll(`[data-sub="${key}"]`).forEach((b) => {
        const out = b.parentElement.querySelector('output');
        if (out) gsap.fromTo(out, { scale: 1.4 }, { scale: 1, duration: 0.3, ease: 'back.out(3)' });
      });
    }
  };

  // Count badge "catches" the flying dot
  const bump = () => {
    if (motion) gsap.fromTo(countEl, { scale: 1.35 }, { scale: 1, duration: 0.4, ease: 'back.out(3)' });
    if (navigator.vibrate) navigator.vibrate(12);
  };

  // A gold dot flies in an arc from the tapped "+" / price to the cart count
  // `from` is the tapped control's rect, measured before change() re-renders it
  const flyToCart = (from, barWasHidden) => {
    if (!motion) { bump(); return; }
    const launch = () => {
      const to = countEl.getBoundingClientRect();
      const dot = document.createElement('span');
      dot.className = 'fly-dot';
      dot.style.left = `${from.left + from.width / 2 - 7}px`;
      dot.style.top = `${from.top + from.height / 2 - 7}px`;
      document.body.appendChild(dot);
      const dx = (to.left + to.width / 2) - (from.left + from.width / 2);
      const dy = (to.top + to.height / 2) - (from.top + from.height / 2);
      gsap.to(dot, { x: dx, duration: 0.55, ease: 'power1.out' });
      gsap.to(dot, {
        y: dy, scale: 0.55, duration: 0.55, ease: 'power2.in',
        onComplete: () => { dot.remove(); bump(); }
      });
    };
    // Let the bar finish sliding in (CSS barIn, 0.25s) before aiming at it
    if (barWasHidden) setTimeout(launch, 260); else launch();
  };

  document.addEventListener('click', (e) => {
    const add = e.target.closest('[data-add]');
    const sub = e.target.closest('[data-sub]');
    if (add) {
      // Measure before change(): it replaces the tapped button's markup
      const fromMenu = list.contains(add);
      const from = add.getBoundingClientRect();
      const barWasHidden = bar.hidden;
      change(add.dataset.add, +1);
      if (fromMenu) flyToCart(from, barWasHidden);
    } else if (sub) change(sub.dataset.sub, -1);
  });

  // After WhatsApp opens: an honest "ready" state (we can't know it was sent)
  const done = sheet.querySelector('.cart__done');
  const showDone = (on) => {
    sheet.classList.toggle('is-done', on);
    done.hidden = !on;
  };
  done.querySelector('.cart__again').addEventListener('click', () => {
    showDone(false);
    sheet.querySelector('.cart__clear').click();
  });
  done.querySelector('.cart__back').addEventListener('click', () => sheet.close());

  const openSheet = () => {
    tableInput.value = table;
    tableError.hidden = true;
    showDone(false);
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
    showDone(true);
  });

  // Initial paint (restored cart)
  items.forEach((_, key) => paintItem(key));
  paintCart();
});

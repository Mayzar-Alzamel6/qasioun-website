/**
 * QR menu: renders window.MENU into #menu, with sticky category chips,
 * a live search filter, an item sheet (js/item-sheet.js) with sizes,
 * options, extras and a note, and a table-order cart that is sent to the
 * restaurant over WhatsApp (number, currency and brand come from
 * window.SITE in js/site-config.js).
 *
 * Table number: each table's QR code links to ?t=<number>#menu.
 */
document.addEventListener('DOMContentLoaded', () => {
  const SITE = window.SITE || {};
  const T = window.i18n;
  const icon = window.icon || (() => '');
  const WHATSAPP = SITE.whatsapp || '';
  const CURRENCY = SITE.currency || '';
  const CART_KEY = 'menu-cart-v2';
  const TABLE_KEY = 'menu-table';
  const CART_TTL = 3 * 60 * 60 * 1000; // forget an abandoned cart after 3 hours

  const chips = document.querySelector('.menu__chips');
  const list = document.querySelector('.menu__list');
  const search = document.querySelector('.menu__search input');
  const empty = document.querySelector('.menu__empty');
  if (!chips || !list) return;

  // Prices are handled in hundredths of the currency unit to avoid
  // floating-point drift.
  const fils = (p) => Math.round(parseFloat(p) * 100);
  const money = (f) => (f / 100).toFixed(2);
  const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const norm = (s) => s.replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').toLowerCase();
  const L = (ar, en) => T.pick(ar, en);

  // Item tags -> icon (labels come from js/i18n.js: tag_<id>)
  const TAGS = { popular: 'star', new: 'spark', spicy: 'chili', veg: 'leaf' };

  /* ---------------------------------------------------------------------
     Data: window.MENU (see js/menu-data.js) -> normalized categories/items
     Item keys are "<category id>:<name>" so a saved cart survives rows
     being reordered in the menu sheet.
     --------------------------------------------------------------------- */
  const photoPaths = (p) => {
    if (!p) return null;
    if (p.includes('/')) return { src: p, thumb: p }; // a path or full URL
    return { src: `assets/img/items/${p}.webp`, thumb: `assets/img/items/${p}-sm.webp` };
  };

  const normalize = (menu) => menu.map((c) => {
    const cat = {
      id: c.id, title: c.title, en: c.en || '', img: c.img || '', icon: c.icon || 'dish',
      note: c.note || '', noteEn: c.noteEn || '', items: []
    };
    const cols = Array.isArray(c.cols) ? c.cols : null;
    cat.items = (c.items || []).map((raw) => {
      const o = Array.isArray(raw) ? { name: raw[0], price: raw[1] } : raw;
      const prices = Array.isArray(o.price) ? o.price : [o.price];
      const sizes = prices.map((p, j) => (p == null || p === '' ? null : {
        label: cols ? cols[j] : '',
        labelEn: cols && c.colsEn ? c.colsEn[j] || '' : '',
        orderLabel: cols ? (c.sizePrefix || '') + cols[j] : '',
        price: fils(p)
      })).filter((s) => s && !Number.isNaN(s.price));
      const addons = o.addons === false ? [] : (o.addons || c.addons || []);
      const choices = o.choices === false ? [] : (o.choices || c.choices || []);
      return {
        key: `${c.id}:${o.name}`,
        cat,
        name: o.name, en: o.en || '', desc: o.desc || '', descEn: o.descEn || '',
        orderName: (c.orderPrefix || '') + o.name,
        sizes,
        addons: addons.map(([name, en, p]) => ({ name, en: en || '', price: fils(p) })),
        choices: choices.map((g) => ({ title: g.title, en: g.en || '', options: g.options.map(([ar, en]) => ({ ar, en: en || '' })) })),
        photo: photoPaths(o.photo),
        tags: (o.tags || []).filter((t) => TAGS[t]).map((t) => ({ id: t, icon: TAGS[t] })),
        featured: !!o.featured, suggest: !!o.suggest, soldOut: !!o.soldOut,
        search: norm([o.name, o.en, o.desc, o.descEn, c.title, c.en].filter(Boolean).join(' '))
      };
    }).filter((it) => it.sizes.length);
    return cat;
  });

  let cats = [];
  let source = [];
  const items = new Map(); // key -> item
  const setModel = (menu) => {
    source = menu;
    cats = normalize(menu);
    items.clear();
    cats.forEach((c) => c.items.forEach((it) => items.set(it.key, it)));
  };

  /* ---------------------------------------------------------------------
     Render
     --------------------------------------------------------------------- */
  const tagsHtml = (it) => {
    const tags = it.tags.map((t) => `<span class="tag tag--${t.id}">${icon(t.icon)}${T.t('tag_' + t.id)}</span>`);
    if (it.soldOut) tags.unshift(`<span class="tag tag--out">${T.t('soldOut')}</span>`);
    return tags.length ? `<div class="tags">${tags.join('')}</div>` : '';
  };

  const priceHtml = (it) => {
    const min = Math.min(...it.sizes.map((s) => s.price));
    return `<p class="menu__price">${it.sizes.length > 1 ? `<small>${T.t('from')}</small> ` : ''}<bdi>${money(min)}</bdi></p>`;
  };

  // Photo slot: the category icon sits behind the image, so a photo that
  // hasn't been added yet (or fails to load) leaves a tidy placeholder.
  const thumbHtml = (it) => `<div class="menu__thumb">
      ${icon(it.cat.icon, 'menu__ph')}
      <img src="${esc(it.photo.thumb)}" alt="" loading="lazy" decoding="async" onerror="this.parentNode.classList.add('is-empty')">
    </div>`;

  const rowHtml = (it) => `
    <li class="menu__item${it.photo ? ' has-photo' : ''}${it.soldOut ? ' is-soldout' : ''}" data-key="${esc(it.key)}">
      <div class="menu__text">
        <h4 class="menu__name"><button type="button" class="menu__open" data-open="${esc(it.key)}">${esc(L(it.name, it.en))}</button></h4>
        ${it.desc ? `<p class="menu__desc">${esc(L(it.desc, it.descEn))}</p>` : ''}
        ${tagsHtml(it)}
        ${priceHtml(it)}
      </div>
      <div class="menu__media">
        ${it.photo ? thumbHtml(it) : ''}
        <span class="menu__qty" data-qty="${esc(it.key)}"></span>
      </div>
    </li>`;

  const catHtml = (c) => `
    <section class="menu__cat" id="cat-${c.id}" data-id="${c.id}">
      <div class="menu__banner${c.img ? '' : ' menu__banner--icon'}">
        ${c.img ? `<img src="${esc(c.img)}" alt="" loading="lazy" decoding="async">` : icon(c.icon, 'menu__icon')}
        <h3>${esc(L(c.title, c.en))}</h3>
      </div>
      <ul>${c.items.map(rowHtml).join('')}</ul>
      ${c.note ? `<p class="menu__note">${esc(L(c.note, c.noteEn))}</p>` : ''}
    </section>`;

  /* ---------------------------------------------------------------------
     Category filter + live search
     Chips filter the list to one category ("الكل" shows everything).
     A search query always looks across the whole menu; clearing it
     brings the selected category back.
     --------------------------------------------------------------------- */
  let filter = 'all';

  const applyView = () => {
    const q = norm(search.value.trim());
    let any = false;
    list.querySelectorAll('.menu__cat').forEach((cat) => {
      const inScope = q || filter === 'all' || cat.dataset.id === filter;
      let shown = 0;
      cat.querySelectorAll('.menu__item').forEach((li) => {
        const it = items.get(li.dataset.key);
        const hit = inScope && (!q || (it && it.search.includes(q)));
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

  // Parallax on banner photos only (icon banners stay still)
  let parallax = [];
  const setupParallax = () => {
    parallax.forEach((tw) => { if (tw.scrollTrigger) tw.scrollTrigger.kill(); tw.kill(); });
    parallax = [];
    if (!motion || !window.ScrollTrigger) return;
    list.querySelectorAll('.menu__banner img').forEach((img) => {
      parallax.push(gsap.fromTo(img, { yPercent: -8, scale: 1.18 }, {
        yPercent: 8, scale: 1.18, ease: 'none',
        scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true }
      }));
    });
  };

  // (Re)draws chips + list from the current model; safe to call again after a
  // language switch or a menu refresh.
  const render = () => {
    if (filter !== 'all' && !cats.some((c) => c.id === filter)) filter = 'all';
    chips.innerHTML = [{ id: 'all', title: T.t('all') }, ...cats.map((c) => ({ id: c.id, title: L(c.title, c.en) }))].map((c) =>
      `<button type="button" class="menu__chip" data-filter="${c.id}" aria-pressed="false">${esc(c.title)}</button>`
    ).join('');
    chips.prepend(indicator);
    list.innerHTML = cats.map(catHtml).join('');
    items.forEach((_, key) => paintItem(key));
    applyView();
    setActive(filter, false);
    setupParallax();
    refreshScroll();
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
    const offset = 64 + chips.offsetHeight + 8;
    const y = list.getBoundingClientRect().top + window.scrollY - offset;
    const far = Math.abs(window.scrollY - y) > 4;
    if (far) window.scrollTo({ top: y, behavior: 'smooth' });
    // The category's own moment (js/cat-fx.js), once the banner is in view
    if (window.catFx && filter !== 'all') {
      const banner = list.querySelector(`#cat-${filter} .menu__banner`);
      setTimeout(() => window.catFx.play(banner, filter), far ? 380 : 60);
    }
  });

  search.addEventListener('input', () => { applyView(); refreshScroll(); });
  // Fonts change chip widths after first paint
  if (document.fonts) document.fonts.ready.then(() => setActive(filter, false));
  window.addEventListener('resize', () => {
    const active = chips.querySelector('.menu__chip.is-active');
    if (active) moveIndicator(active, false);
  });

  // The WhatsApp button sits over the "+" column (left side in RTL):
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
     Cart: lines of { k: item key, s: size, a: [extras], c: [option per
     choice group], note, n: quantity }. The same item with different
     options is a separate line. Persisted per device, expires after CART_TTL.
     --------------------------------------------------------------------- */
  let cart = {}; // line id -> line

  const lineId = (l) => `${l.k}|${l.s}|${l.a.join('.')}|${l.c.join('.')}|${l.note}`;
  const plainLine = (it) => ({ k: it.key, s: 0, a: [], c: it.choices.map(() => 0), note: '' });
  const quickAdd = (it) => it.sizes.length === 1; // no size to choose: "+" adds straight away

  const isIdx = (v, len) => Number.isInteger(v) && v >= 0 && v < len;
  const validLine = (l) => {
    const it = l && items.get(l.k);
    return !!it && !it.soldOut && isIdx(l.s, it.sizes.length)
      && Array.isArray(l.a) && l.a.every((i) => isIdx(i, it.addons.length))
      && Array.isArray(l.c) && l.c.length === it.choices.length && l.c.every((o, gi) => isIdx(o, it.choices[gi].options.length))
      && typeof l.note === 'string' && Number.isInteger(l.n) && l.n > 0;
  };

  const unitPrice = (l) => {
    const it = items.get(l.k);
    return it.sizes[l.s].price + l.a.reduce((sum, i) => sum + it.addons[i].price, 0);
  };

  const save = () => {
    try { localStorage.setItem(CART_KEY, JSON.stringify({ at: Date.now(), lines: cart })); } catch (e) { /* ignore */ }
  };

  const restoreCart = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(CART_KEY) || 'null');
      if (!saved || Date.now() - saved.at > CART_TTL) return;
      Object.values(saved.lines || {}).forEach((l) => {
        if (!validLine(l)) return;
        const line = { k: l.k, s: l.s, a: [...new Set(l.a)].sort((x, y) => x - y), c: l.c, note: l.note.slice(0, 120), n: Math.min(l.n, 99) };
        cart[lineId(line)] = line;
      });
    } catch (e) { cart = {}; }
  };

  // After the menu changes (language, refreshed data): drop lines whose item
  // is gone or sold out. Returns true when something was removed.
  const pruneCart = () => {
    let removed = false;
    Object.entries(cart).forEach(([id, l]) => {
      if (!validLine(l)) { delete cart[id]; removed = true; }
    });
    if (removed) save();
    return removed;
  };

  const totals = () => Object.values(cart).reduce((t, l) => {
    t.count += l.n;
    t.sum += unitPrice(l) * l.n;
    return t;
  }, { count: 0, sum: 0 });

  const stepper = (id, n) =>
    `<span class="stepper">
      <button type="button" data-inc="${esc(id)}" aria-label="${T.t('inc')}">+</button>
      <output aria-live="polite">${n}</output>
      <button type="button" data-dec="${esc(id)}" aria-label="${T.t('dec')}">−</button>
    </span>`;

  // Update the in-menu control(s) for one item: a stepper for its plain
  // line, else a "+" that shows how many are in the order.
  const paintItem = (key) => {
    const it = items.get(key);
    if (!it) return;
    let markup = '';
    if (!it.soldOut) {
      const plain = lineId(plainLine(it));
      const plainN = cart[plain] ? cart[plain].n : 0;
      const total = Object.values(cart).reduce((sum, l) => sum + (l.k === key ? l.n : 0), 0);
      const name = L(it.name, it.en);
      markup = quickAdd(it) && plainN
        ? stepper(plain, plainN)
        : `<button type="button" class="menu__add" data-quick="${esc(key)}" aria-label="${esc(T.t('add', { name }))}${total ? ` — ${T.t('inOrder', { n: total })}` : ''}">+${total ? `<span class="menu__count" aria-hidden="true">${total}</span>` : ''}</button>`;
    }
    document.querySelectorAll(`[data-qty="${CSS.escape(key)}"]`).forEach((el) => { el.innerHTML = markup; });
  };

  // Size / extras / options / note of a line, in the menu language (sheet)
  // or always in Arabic (WhatsApp order for the staff).
  const lineParts = (l, ar) => {
    const it = items.get(l.k);
    const pick = ar ? (a) => a : L;
    const size = it.sizes[l.s];
    return {
      name: ar ? it.orderName : L(it.name, it.en),
      size: ar ? size.orderLabel : L(size.label, size.labelEn),
      extras: l.a.map((i) => pick(it.addons[i].name, it.addons[i].en)),
      options: it.choices.map((g, gi) => `${pick(g.title, g.en)}: ${pick(g.options[l.c[gi]].ar, g.options[l.c[gi]].en)}`),
      note: l.note
    };
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

    lines.innerHTML = Object.entries(cart).map(([id, l]) => {
      const p = lineParts(l, false);
      const sub = [p.size, p.extras.length ? `+ ${p.extras.join('، ')}` : '', ...p.options].filter(Boolean);
      return `<li class="cart__line">
        <div class="cart__info">
          <strong>${esc(p.name)}</strong>
          ${sub.length ? `<small>${esc(sub.join(' · '))}</small>` : ''}
          ${p.note ? `<small class="cart__line-note">«${esc(p.note)}»</small>` : ''}
        </div>
        ${stepper(id, l.n)}
        <span class="cart__price"><bdi>${money(unitPrice(l) * l.n)}</bdi></span>
      </li>`;
    }).join('') || `<li class="cart__empty">${T.t('cartEmpty')}</li>`;
  };

  const addLine = (l) => {
    const line = { k: l.k, s: l.s, a: [...l.a].sort((x, y) => x - y), c: l.c, note: l.note || '', n: 0 };
    const id = lineId(line);
    const cur = cart[id] || line;
    cur.n = Math.min(99, cur.n + (l.n || 1));
    cart[id] = cur;
    save();
    paintItem(line.k);
    paintCart();
  };

  const change = (id, delta) => {
    const l = cart[id];
    if (!l) return;
    l.n = Math.max(0, Math.min(99, l.n + delta));
    if (!l.n) delete cart[id];
    save();
    paintItem(l.k);
    paintCart();
    // Quantity pops in the menu row and in the sheet
    if (motion && l.n) {
      document.querySelectorAll(`[data-dec="${CSS.escape(id)}"]`).forEach((b) => {
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

  // A dot flies in an arc from the tapped control to the cart count.
  // `from` is the control's rect, measured before it was re-rendered.
  const flyToCart = (from, delay = 0) => {
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
    if (delay) setTimeout(launch, delay); else launch();
  };

  // The bar slides in (CSS barIn, 0.25s) the first time: aim after it lands
  const barDelay = (wasHidden) => (wasHidden ? 260 : 0);

  const openItem = (it, fromEl) => {
    const row = fromEl.closest('.menu__item');
    const origin = row && row.querySelector('.menu__thumb img');
    window.itemSheet.open(it, {
      origin,
      money,
      currency: CURRENCY,
      onAdd: (l, rect) => {
        addLine({ k: it.key, ...l });
        // The sheet slides away first (0.3s)
        flyToCart(rect, motion ? 300 : 0);
      }
    });
  };

  document.addEventListener('click', (e) => {
    const quick = e.target.closest('[data-quick]');
    const inc = e.target.closest('[data-inc]');
    const dec = e.target.closest('[data-dec]');
    const open = e.target.closest('[data-open]');
    if (quick) {
      const it = items.get(quick.dataset.quick);
      if (!it || it.soldOut) return;
      if (!quickAdd(it)) { openItem(it, quick); return; }
      // Measure before addLine(): it replaces the tapped button's markup
      const from = quick.getBoundingClientRect();
      const wasHidden = bar.hidden;
      addLine({ ...plainLine(it), n: 1 });
      flyToCart(from, barDelay(wasHidden));
    } else if (inc) {
      const from = inc.getBoundingClientRect();
      const wasHidden = bar.hidden;
      change(inc.dataset.inc, +1);
      if (list.contains(inc)) flyToCart(from, barDelay(wasHidden));
    } else if (dec) {
      change(dec.dataset.dec, -1);
    } else if (open) {
      const it = items.get(open.dataset.open);
      if (it) openItem(it, open);
    }
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
    document.documentElement.classList.add('sheet-open');
  };
  bar.querySelector('button').addEventListener('click', openSheet);
  sheet.addEventListener('close', () => document.documentElement.classList.remove('sheet-open'));
  sheet.querySelector('.cart__close').addEventListener('click', () => sheet.close());
  sheet.addEventListener('click', (e) => { if (e.target === sheet) sheet.close(); }); // backdrop tap

  tableInput.addEventListener('input', () => {
    table = cleanTable(tableInput.value);
    tableError.hidden = true;
    try { sessionStorage.setItem(TABLE_KEY, table); } catch (err) { /* ignore */ }
    showTable();
  });

  sheet.querySelector('.cart__clear').addEventListener('click', () => {
    const keys = new Set(Object.values(cart).map((l) => l.k));
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
      alert(T.t('noWhatsapp'));
      return;
    }
    if (!table) {
      tableError.hidden = false;
      tableInput.focus();
      return;
    }
    // Always in Arabic: the message is read by the staff
    const rows = Object.values(cart).flatMap((l) => {
      const p = lineParts(l, true);
      return [
        `• ${l.n} × ${p.name}${p.size ? ` (${p.size})` : ''} — ${money(unitPrice(l) * l.n)}`,
        p.extras.length ? `   + ${p.extras.join('، ')}` : null,
        ...p.options.map((o) => `   ${o}`),
        p.note ? `   ملاحظة: ${p.note}` : null
      ].filter(Boolean);
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

  /* ---------------------------------------------------------------------
     Start
     --------------------------------------------------------------------- */
  setModel(window.MENU || []);
  restoreCart();
  render();
  paintCart();

  // Re-render with new menu data or after a language switch (keeps the cart)
  window.menuApp = {
    rebuild(menu) {
      setModel(menu || source);
      const removed = pruneCart();
      render();
      paintCart();
      return removed;
    }
  };
});

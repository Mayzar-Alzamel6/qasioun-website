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
  const CURRENCY = SITE.currency || ''; // WhatsApp order (always Arabic)
  const cur = () => (T.lang === 'en' && SITE.currencyEn) || CURRENCY; // on screen
  const CART_KEY = 'menu-cart-v2';
  const TABLE_KEY = 'menu-table';
  const CART_TTL = 3 * 60 * 60 * 1000; // forget an abandoned cart after 3 hours

  const chips = document.querySelector('.menu__chips');
  const list = document.querySelector('.menu__list');
  const search = document.querySelector('.menu__search input');
  const empty = document.querySelector('.menu__empty');
  const featured = document.querySelector('.menu__featured');
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
      note: c.note || '', noteEn: c.noteEn || '',
      sizeTitle: c.colsTitle || '', sizeTitleEn: c.colsTitleEn || '', items: []
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

  // "Most loved" row: featured items as big photo cards. An item without its
  // own photo borrows its category's; the slot placeholder covers the rest.
  const featCardHtml = (it) => {
    const src = it.photo ? it.photo.src : it.cat.img;
    return `<li class="feat__card" data-key="${esc(it.key)}">
      <div class="feat__photo${src ? '' : ' is-empty'}">
        ${icon(it.cat.icon, 'menu__ph')}
        ${src ? `<img src="${esc(src)}" alt="" loading="lazy" decoding="async" onerror="this.parentNode.classList.add('is-empty')">` : ''}
      </div>
      <div class="feat__body">
        <h4 class="feat__name"><button type="button" class="menu__open" data-open="${esc(it.key)}">${esc(L(it.name, it.en))}</button></h4>
        <p class="feat__cat">${esc(L(it.cat.title, it.cat.en))}</p>
        <div class="feat__row">
          ${priceHtml(it)}
          <span class="menu__qty" data-qty="${esc(it.key)}"></span>
        </div>
      </div>
    </li>`;
  };

  const featHtml = (feats) => `
    <div class="feat__head">
      <h3 id="feat-title">${icon('star')}${T.t('featured')}</h3>
      <div class="feat__nav">
        <button type="button" class="feat__arrow" data-feat="-1" aria-label="${T.t('prev')}">${icon('chevron')}</button>
        <button type="button" class="feat__arrow" data-feat="1" aria-label="${T.t('next')}">${icon('chevron')}</button>
      </div>
    </div>
    <ul class="feat__track">${feats.map(featCardHtml).join('')}</ul>`;

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
    if (featured) featured.hidden = !!q || filter !== 'all' || !featured.firstElementChild;
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

  // Menu sections use content-visibility: auto (see style.css), so their real
  // height is only known once they first render: re-measure the triggers then.
  const measured = new WeakSet();
  document.addEventListener('contentvisibilityautostatechange', (e) => {
    if (e.skipped || measured.has(e.target)) return;
    measured.add(e.target);
    refreshScroll();
  }, true); // capture: the event doesn't bubble

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
    if (featured) {
      const feats = [...items.values()].filter((it) => it.featured && !it.soldOut);
      featured.innerHTML = feats.length ? featHtml(feats) : '';
    }
    items.forEach((_, key) => paintItem(key));
    applyView();
    setActive(filter, false);
    setupParallax();
    refreshScroll();
  };

  // Featured cards rise in the first time the row scrolls into view
  let featTrigger = null;
  const animateFeatured = () => {
    if (featTrigger) featTrigger.kill();
    featTrigger = null;
    if (!motion || !window.ScrollTrigger || !featured || featured.hidden) return;
    const cards = featured.querySelectorAll('.feat__card');
    gsap.set(cards, { autoAlpha: 0, y: 26 });
    featTrigger = ScrollTrigger.create({
      trigger: featured,
      start: 'top 90%',
      once: true,
      onEnter: () => gsap.to(cards, {
        autoAlpha: 1, y: 0, duration: 0.5, ease: 'power3.out', stagger: 0.07, clearProps: 'transform,opacity,visibility'
      })
    });
  };

  // Desktop arrows: scroll the row by two cards
  if (featured) {
    featured.addEventListener('click', (e) => {
      const arrow = e.target.closest('[data-feat]');
      if (!arrow) return;
      const track = featured.querySelector('.feat__track');
      const card = track.querySelector('.feat__card');
      const step = card ? (card.offsetWidth + 14) * 2 : 300;
      const rtl = getComputedStyle(track).direction === 'rtl';
      track.scrollBy({ left: Number(arrow.dataset.feat) * step * (rtl ? -1 : 1), behavior: motion ? 'smooth' : 'auto' });
    });
  }

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

  // The WhatsApp button sits over the "+" buttons (left side in RTL):
  // hide it while the menu list or the featured row is on screen.
  const fab = document.querySelector('.wa-fab');
  if (fab) {
    const visible = new Set();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) visible.add(e.target); else visible.delete(e.target); });
      fab.classList.toggle('is-hidden', visible.size > 0);
    });
    io.observe(list);
    if (featured) io.observe(featured);
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

  // The table badge opens two quick requests (waiter / bill) sent over WhatsApp
  const service = document.querySelector('.menu__service');
  const serviceBtn = service && service.querySelector('.menu__table');
  const actions = service && service.querySelector('.menu__actions');
  const showTable = () => {
    if (!service) return;
    service.hidden = !table;
    service.querySelector('b').textContent = table;
    service.classList.toggle('is-static', !WHATSAPP);
  };
  showTable();

  const toggleActions = (open) => {
    actions.hidden = !open;
    serviceBtn.setAttribute('aria-expanded', String(open));
    if (open && motion) {
      gsap.fromTo(actions.children, { autoAlpha: 0, y: -6 }, { autoAlpha: 1, y: 0, duration: 0.25, stagger: 0.05, clearProps: 'all' });
    }
  };

  /* Small status message above the cart bar */
  const toastEl = document.querySelector('.toast');
  let toastTimer;
  const toast = (text) => {
    if (!toastEl) return;
    toastEl.textContent = text;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.hidden = true; }, 3200);
  };

  if (service) {
    serviceBtn.addEventListener('click', () => { if (WHATSAPP) toggleActions(actions.hidden); });
    actions.addEventListener('click', (e) => {
      const b = e.target.closest('[data-service]');
      if (!b || !table) return;
      // In Arabic: read by the staff
      const text = b.dataset.service === 'bill'
        ? `🧾 طاولة ${table}: الحساب لو سمحت`
        : `🔔 طاولة ${table}: نرجو حضور الجرسون`;
      window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
      toggleActions(false);
      toast(T.t('serviceSent'));
    });
  }

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
      // Arabic keeps the prefix ("خبز صاج"); English labels are complete
      size: ar || T.lang !== 'en' ? size.orderLabel : size.labelEn || size.label,
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
        onUpdate: () => { totalEl.textContent = `${money(Math.round(shownTotal.v))} ${cur()}`; }
      });
    } else {
      shownTotal.v = sum;
      totalEl.textContent = `${money(sum)} ${cur()}`;
    }
    sheet.querySelector('.cart__sum').textContent = `${money(sum)} ${cur()}`;

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
    paintUpsell();
  };

  // "Add something?": one suggested item from each category that isn't in
  // the order yet (items marked `suggest`), up to four
  const upsell = sheet.querySelector('.upsell');
  const paintUpsell = () => {
    if (!upsell) return;
    const inOrder = new Set(Object.values(cart).map((l) => items.get(l.k).cat.id));
    const picks = [];
    items.forEach((it) => {
      if (picks.length < 4 && it.suggest && !it.soldOut && !inOrder.has(it.cat.id) && !picks.some((p) => p.cat === it.cat)) picks.push(it);
    });
    upsell.hidden = !inOrder.size || !picks.length;
    upsell.querySelector('.upsell__title').textContent = T.t('upsell');
    upsell.querySelector('.upsell__track').innerHTML = picks.map((it) => {
      const src = it.photo ? it.photo.thumb : '';
      const name = L(it.name, it.en);
      return `<li class="upsell__card">
        <div class="upsell__thumb${src ? '' : ' is-empty'}">
          ${icon(it.cat.icon, 'menu__ph')}
          ${src ? `<img src="${esc(src)}" alt="" loading="lazy" decoding="async" onerror="this.parentNode.classList.add('is-empty')">` : ''}
        </div>
        <div class="upsell__text"><strong>${esc(name)}</strong><bdi>${money(Math.min(...it.sizes.map((z) => z.price)))}</bdi></div>
        <button type="button" class="menu__add upsell__add" data-quick="${esc(it.key)}" aria-label="${esc(T.t('add', { name }))}">+</button>
      </li>`;
    }).join('');
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
    const row = fromEl.closest('.menu__item, .feat__card');
    const origin = row && row.querySelector('.menu__thumb img, .feat__photo img');
    window.itemSheet.open(it, {
      origin,
      money,
      currency: cur(),
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
      if (!sheet.contains(quick)) flyToCart(from, barDelay(wasHidden));
    } else if (inc) {
      const from = inc.getBoundingClientRect();
      const wasHidden = bar.hidden;
      change(inc.dataset.inc, +1);
      if (!sheet.contains(inc)) flyToCart(from, barDelay(wasHidden));
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
  const start = (menu) => {
    setModel(menu);
    restoreCart(); // needs the real items to validate saved lines
    render();
    paintCart();
    animateFeatured();
  };

  // Placeholder rows while the menu sheet loads on a first visit
  const renderSkeleton = () => {
    const card = `<div class="skel__banner"></div><div class="skel__card">${'<div class="skel__row"><span></span><span></span></div>'.repeat(4)}</div>`;
    list.setAttribute('aria-busy', 'true');
    list.innerHTML = `<div class="skel" aria-hidden="true">${card.repeat(2)}</div>`;
  };

  const src = window.menuSource;
  if (!src || !src.enabled) {
    start(window.MENU || []);
  } else {
    // Menu from the Google Sheet (js/sheet.js): this device's last copy shows
    // at once and is refreshed in the background; a first visit waits for the
    // sheet (4s at most, then the menu bundled in js/menu-data.js).
    let started = false;
    let shown = '';
    const show = (menu) => {
      const json = JSON.stringify(menu);
      if (json === shown) return;
      shown = json;
      if (!started) {
        started = true;
        list.removeAttribute('aria-busy');
        start(menu);
      } else {
        window.menuApp.rebuild(menu);
      }
    };
    const cached = src.cached();
    if (cached) show(cached); else renderSkeleton();
    src.load(4000).then(show).catch(() => {
      if (!started) show(window.MENU || []);
      return src.load(15000).then(show); // slow network: one more, longer try
    }).catch(() => {});
    // Back on the page after a while: pick up sold-out items and new prices
    let lastLoad = Date.now();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible' || Date.now() - lastLoad < 60000) return;
      lastLoad = Date.now();
      src.load(6000).then(show).catch(() => {});
    });
  }

  // Language switch (js/i18n.js): redraw the menu and cart in the new language
  document.addEventListener('langchange', () => {
    window.itemSheet.close({ toOrigin: false });
    window.menuApp.rebuild();
  });

  // Re-render with new menu data or after a language switch (keeps the cart)
  window.menuApp = {
    rebuild(menu) {
      setModel(menu || source);
      const removed = pruneCart();
      render();
      paintCart();
      if (removed) toast(T.t('removedItems'));
      return removed;
    }
  };
});

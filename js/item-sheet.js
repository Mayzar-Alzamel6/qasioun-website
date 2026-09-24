/**
 * Item sheet: the full card of one menu item (big photo, description, size,
 * options, extras, a note and the quantity), opened from the menu list.
 *
 *   itemSheet.open(item, { origin, money, currency, onAdd })
 *     item      normalized item from js/menu.js
 *     origin    the row's thumbnail <img>: with View Transitions the photo
 *               grows out of it and flies back into it on close
 *     onAdd({ s, a, c, note, n }, fromRect)   called by "add to order"
 *
 * Without View Transitions (or with reduced motion) the sheet simply slides
 * up/down (CSS sheetUp / sheetDown, none for reduced motion).
 */
(() => {
  const dlg = document.querySelector('.isheet');
  window.itemSheet = { open() {}, close() {} };
  if (!dlg) return;

  const html = document.documentElement;
  const T = window.i18n;
  const icon = window.icon || (() => '');
  const motion = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canVT = motion && typeof document.startViewTransition === 'function';

  let item = null;      // item being shown
  let opts = {};
  let origin = null;    // thumbnail it opened from
  let qty = 1;

  const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const tagsHtml = (tags) => tags.length
    ? `<div class="tags">${tags.map((t) => `<span class="tag tag--${t.id}">${icon(t.icon)}${T.t('tag_' + t.id)}</span>`).join('')}</div>`
    : '';

  const build = () => {
    const it = item;
    const L = T.pick;
    const price = (f) => opts.money(f);
    const sizes = it.sizes.length > 1
      ? `<fieldset class="isheet__group">
          <legend>${T.t('chooseSize')}</legend>
          ${it.sizes.map((s, i) => `<label class="opt">
            <input type="radio" name="s" value="${i}"${i === 0 ? ' checked' : ''}>
            <span class="opt__name">${esc(L(s.label, s.labelEn))}</span>
            <bdi class="opt__price">${price(s.price)}</bdi>
          </label>`).join('')}
        </fieldset>`
      : '';
    const choices = it.choices.map((g, gi) => `<fieldset class="isheet__group">
        <legend>${esc(L(g.title, g.en))}</legend>
        <div class="isheet__pills">
          ${g.options.map((o, oi) => `<label class="pill-opt">
            <input type="radio" name="c${gi}" value="${oi}"${oi === 0 ? ' checked' : ''}>
            <span>${esc(L(o.ar, o.en))}</span>
          </label>`).join('')}
        </div>
      </fieldset>`).join('');
    const addons = it.addons.length
      ? `<fieldset class="isheet__group">
          <legend>${T.t('extras')} <small>(${T.t('optional')})</small></legend>
          ${it.addons.map((a, i) => `<label class="opt opt--check">
            <input type="checkbox" name="a" value="${i}">
            <span class="opt__name">${esc(L(a.name, a.en))}</span>
            <bdi class="opt__price">+${price(a.price)}</bdi>
          </label>`).join('')}
        </fieldset>`
      : '';

    dlg.innerHTML = `
      <button type="button" class="isheet__close" data-close aria-label="${T.t('close')}">${icon('close')}</button>
      <div class="isheet__inner">
        <div class="isheet__photo">
          ${icon(it.cat.icon, 'isheet__ph')}
          <img alt="">
        </div>
        <div class="isheet__body">
          <h2 id="isheet-title" tabindex="-1" autofocus>${esc(L(it.name, it.en))}</h2>
          ${tagsHtml(it.tags)}
          ${it.desc ? `<p class="isheet__desc">${esc(L(it.desc, it.descEn))}</p>` : ''}
          ${sizes}${choices}${addons}
          <label class="isheet__note">
            <span>${T.t('itemNote')} <small>(${T.t('optional')})</small></span>
            <textarea name="note" rows="2" maxlength="120" placeholder="${T.t('itemNotePh')}"></textarea>
          </label>
        </div>
        <div class="isheet__foot">
          <span class="stepper" aria-label="${T.t('qty')}">
            <button type="button" data-q="1" aria-label="${T.t('inc')}">+</button>
            <output aria-live="polite">1</output>
            <button type="button" data-q="-1" aria-label="${T.t('dec')}">−</button>
          </span>
          <button type="button" class="btn isheet__add"${it.soldOut ? ' disabled' : ''}>
            ${it.soldOut ? T.t('soldOut') : `<span>${T.t('addToOrder')}</span><bdi class="isheet__total"></bdi>`}
          </button>
        </div>
      </div>`;

    // Photo: the loaded thumbnail first (instant, and what the transition
    // morphs from), then the large version; else the category photo; else
    // the tinted icon placeholder.
    const box = dlg.querySelector('.isheet__photo');
    const img = box.querySelector('img');
    const fallback = () => {
      if (it.cat.img && img.getAttribute('src') !== it.cat.img) {
        box.classList.add('is-cat');
        img.src = it.cat.img;
      } else {
        box.classList.add('is-empty');
      }
    };
    img.addEventListener('error', fallback);
    if (it.photo) {
      if (origin) {
        img.src = origin.currentSrc || origin.src;
        const big = new Image();
        big.src = it.photo.src;
        (big.decode ? big.decode() : Promise.reject()).then(() => {
          if (item === it) img.src = big.src;
        }).catch(() => {});
      } else {
        img.src = it.photo.src;
      }
    } else {
      fallback();
    }
    qty = 1;
    update();
  };

  // Current selection -> { s, a, c, note, n } and the running total
  const read = () => {
    const f = dlg;
    const s = item.sizes.length > 1 ? Number(f.querySelector('input[name="s"]:checked').value) : 0;
    const a = [...f.querySelectorAll('input[name="a"]:checked')].map((el) => Number(el.value));
    const c = item.choices.map((_, gi) => Number(f.querySelector(`input[name="c${gi}"]:checked`).value));
    const note = f.querySelector('textarea').value.trim().replace(/\s+/g, ' ');
    return { s, a, c, note, n: qty };
  };

  const update = () => {
    const total = dlg.querySelector('.isheet__total');
    dlg.querySelector('.isheet__foot output').textContent = qty;
    if (!total) return;
    const { s, a } = read();
    const unit = item.sizes[s].price + a.reduce((sum, i) => sum + item.addons[i].price, 0);
    total.textContent = `${opts.money(unit * qty)} ${opts.currency}`;
  };

  const lock = (on) => html.classList.toggle('sheet-open', on);

  const show = () => {
    dlg.showModal();
    lock(true);
    dlg.querySelector('.isheet__inner').scrollTop = 0;
  };

  const hide = () => {
    dlg.classList.remove('is-closing');
    if (dlg.open) dlg.close();
    lock(false);
  };

  const photoReady = (el) => el && el.isConnected && el.complete && el.naturalWidth > 0;
  const onScreen = (el) => {
    const r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight;
  };

  // Run a DOM change as a view transition where the photo morphs between
  // `from` and `to` and the sheet panel slides (see ::view-transition rules).
  const morph = (from, to, change) => {
    from.style.viewTransitionName = 'isheet-photo';
    html.classList.add('vt-isheet');
    const tr = document.startViewTransition(() => {
      from.style.viewTransitionName = '';
      to.style.viewTransitionName = 'isheet-photo';
      change();
    });
    tr.finished.finally(() => {
      to.style.viewTransitionName = '';
      html.classList.remove('vt-isheet');
    });
  };

  const open = (it, o = {}) => {
    if (dlg.open) hide();
    item = it;
    opts = o;
    origin = it.photo && photoReady(o.origin) ? o.origin : null;
    build();
    if (canVT && origin) {
      // The transition captures the sheet photo right away: decode it first
      // (it's the already-loaded thumbnail, so this takes a few ms).
      const photo = dlg.querySelector('.isheet__photo img');
      const go = () => { if (item === it) morph(origin, photo, show); };
      (photo.decode ? photo.decode() : Promise.resolve()).then(go, go);
    } else {
      show();
    }
  };

  // toOrigin: fly the photo back into the thumbnail (close button, backdrop, Esc);
  // after "add to order" the sheet just slides down.
  const close = ({ toOrigin = true } = {}) => {
    if (!dlg.open || dlg.classList.contains('is-closing')) return;
    const photo = dlg.querySelector('.isheet__photo img');
    if (toOrigin && canVT && origin && photoReady(origin) && onScreen(origin) && photoReady(photo)) {
      morph(photo, origin, hide);
    } else if (motion) {
      dlg.classList.add('is-closing');
      const done = () => { clearTimeout(timer); hide(); };
      const timer = setTimeout(done, 400); // in case animationend never fires
      dlg.addEventListener('animationend', done, { once: true });
    } else {
      hide();
    }
  };

  dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(); }); // Esc
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) { close(); return; } // backdrop
    if (e.target.closest('[data-close]')) { close(); return; }
    const q = e.target.closest('[data-q]');
    if (q) {
      qty = Math.max(1, Math.min(99, qty + Number(q.dataset.q)));
      update();
      return;
    }
    const add = e.target.closest('.isheet__add');
    if (add && !add.disabled && opts.onAdd) {
      const rect = add.getBoundingClientRect();
      const line = read();
      close({ toOrigin: false });
      opts.onAdd(line, rect);
    }
  });
  dlg.addEventListener('change', update);

  window.itemSheet = { open, close };
})();

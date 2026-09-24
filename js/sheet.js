/**
 * Menu from a Google Sheet (optional): the restaurant edits prices, items,
 * "available" checkboxes... in the sheet and the site follows within seconds.
 * Off when SITE.sheetId is empty: js/menu-data.js is used as is.
 *
 * The sheet must be shared as "Anyone with the link: Viewer". Four tabs,
 * first row = headers (see _private/menu-sheet-template.xlsx and the guide):
 *   الأقسام    الرمز | الاسم | English | الصورة | الأيقونة | الأحجام | Sizes |
 *              عنوان الأحجام | Sizes title | ملاحظة | Note | بادئة الحجم | بادئة الطلب
 *   الأصناف    القسم | الاسم | English | الوصف | الوصف English | السعر 1 | السعر 2 |
 *              السعر 3 | الصورة | الشارات | مميز | اقتراح | متوفر
 *   الإضافات   القسم | الصنف | الإضافة | English | السعر
 *   الخيارات   القسم | الصنف | العنوان | English | الخيارات | Options
 * Prices are numbers, one column per size (a column mixing numbers and text
 * would lose values in Google's CSV export). "الصنف" empty = the whole category;
 * an extras row with the item's name and no extra = no extras for that item.
 *
 * API used by menu.js:
 *   menuSource.enabled
 *   menuSource.cached()          last menu from this device (or null)
 *   menuSource.load(timeoutMs)   Promise -> menu in the js/menu-data.js format
 */
(() => {
  const SITE = window.SITE || {};
  const id = (SITE.sheetId || '').trim();
  const CACHE_KEY = 'menu-sheet-cache';
  const TABS = { cats: 'الأقسام', items: 'الأصناف', addons: 'الإضافات', choices: 'الخيارات' };

  window.menuSource = { enabled: false, cached: () => null, load: () => Promise.reject(new Error('no sheet')) };
  if (!id) return;

  const url = (tab) => `https://docs.google.com/spreadsheets/d/${encodeURIComponent(id)}/gviz/tq?tqx=out:csv&headers=1&sheet=${encodeURIComponent(tab)}`;

  // RFC 4180 CSV: quoted fields, "" escapes, newlines inside quotes
  const parseCSV = (text) => {
    const rows = [];
    let row = [], field = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (quoted) {
        if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
        else if (ch === '"') quoted = false;
        else field += ch;
      } else if (ch === '"') quoted = true;
      else if (ch === ',') { row.push(field); field = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(field); rows.push(row); row = []; field = '';
      } else field += ch;
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows;
  };

  // Rows -> objects keyed by the (trimmed) header names; blank rows dropped
  const table = (text) => {
    const [head = [], ...rows] = parseCSV(text.replace(/^﻿/, ''));
    const keys = head.map((h) => h.trim());
    return rows
      .filter((r) => r.some((v) => v.trim() !== ''))
      .map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] || '').trim()])));
  };

  const DIGITS = { '٠': 0, '١': 1, '٢': 2, '٣': 3, '٤': 4, '٥': 5, '٦': 6, '٧': 7, '٨': 8, '٩': 9 };
  const num = (v) => {
    const s = String(v || '').replace(/[٠-٩]/g, (d) => DIGITS[d]).replace(/[٫,]/g, '.').replace(/[^\d.]/g, '');
    return s === '' || Number.isNaN(parseFloat(s)) ? null : parseFloat(s).toFixed(2);
  };
  const bool = (v) => /^(true|1|yes|نعم|✓|✔)$/i.test(String(v).trim());
  const list = (v) => String(v || '').split(/[،,]/).map((x) => x.trim()).filter(Boolean);
  const TAGS = { 'الأكثر طلباً': 'popular', 'الأكثر طلبا': 'popular', 'جديد': 'new', 'حار': 'spicy', 'نباتي': 'veg', popular: 'popular', new: 'new', spicy: 'spicy', veg: 'veg' };
  const tags = (v) => list(v).map((t) => TAGS[t] || TAGS[t.toLowerCase()]).filter(Boolean);
  const bannerPath = (v) => (!v ? '' : v.includes('/') ? v : `assets/img/menu/${v}.webp`);

  // Extras / options rows grouped by "category" or "category:item"
  const group = (rows, make) => {
    const m = new Map();
    rows.forEach((r) => {
      const cid = r['القسم'];
      if (!cid) return;
      const key = r['الصنف'] ? `${cid}:${r['الصنف']}` : cid;
      if (!m.has(key)) m.set(key, []);
      const v = make(r);
      if (v) m.get(key).push(v);
    });
    return m;
  };

  const toMenu = ({ cats, items, addons, choices }) => {
    const extras = group(addons, (r) => (r['الإضافة'] ? [r['الإضافة'], r['English'] || '', num(r['السعر']) || '0'] : null));
    const opts = group(choices, (r) => {
      const ar = list(r['الخيارات']);
      if (!r['العنوان'] || !ar.length) return null;
      const en = list(r['Options']);
      return { title: r['العنوان'], en: r['English'] || '', options: ar.map((o, i) => [o, en[i] || '']) };
    });
    const byId = new Map();
    const menu = [];
    cats.forEach((r) => {
      const cid = r['الرمز'];
      if (!cid || byId.has(cid)) return;
      const sizes = list(r['الأحجام']);
      const c = {
        id: cid, title: r['الاسم'] || cid, en: r['English'] || '',
        img: bannerPath(r['الصورة']), icon: r['الأيقونة'] || 'dish',
        note: r['ملاحظة'] || '', noteEn: r['Note'] || '',
        items: []
      };
      if (sizes.length) {
        c.cols = sizes;
        c.colsEn = list(r['Sizes']);
        c.colsTitle = r['عنوان الأحجام'] || '';
        c.colsTitleEn = r['Sizes title'] || '';
      }
      if (r['بادئة الحجم']) c.sizePrefix = r['بادئة الحجم'] + ' ';
      if (r['بادئة الطلب']) c.orderPrefix = r['بادئة الطلب'] + ' ';
      if (extras.has(cid)) c.addons = extras.get(cid);
      if (opts.has(cid)) c.choices = opts.get(cid);
      byId.set(cid, c);
      menu.push(c);
    });
    items.forEach((r) => {
      const c = byId.get(r['القسم']);
      const name = r['الاسم'];
      if (!c || !name) return;
      const prices = [r['السعر 1'], r['السعر 2'], r['السعر 3']].map(num);
      const it = {
        name, en: r['English'] || '', desc: r['الوصف'] || '', descEn: r['الوصف English'] || '',
        price: c.cols ? prices.slice(0, c.cols.length) : prices[0],
        tags: tags(r['الشارات']),
        featured: bool(r['مميز']),
        suggest: bool(r['اقتراح']),
        // Unticked "available" = sold out; an empty cell counts as available
        soldOut: r['متوفر'] !== undefined && r['متوفر'] !== '' && !bool(r['متوفر'])
      };
      if (r['الصورة']) it.photo = r['الصورة'];
      const key = `${c.id}:${name}`;
      if (extras.has(key)) it.addons = extras.get(key).length ? extras.get(key) : false;
      if (opts.has(key)) it.choices = opts.get(key);
      c.items.push(it);
    });
    return menu.filter((c) => c.items.length);
  };

  const get = (tab, signal) => fetch(url(tab), { cache: 'no-store', signal }).then((r) => {
    if (!r.ok) throw new Error(`${tab}: HTTP ${r.status}`);
    return r.text();
  }).then(table);

  const load = (timeoutMs = 4000) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    return Promise.all([
      get(TABS.cats, ctrl.signal),
      get(TABS.items, ctrl.signal),
      // Extras / options tabs are optional
      get(TABS.addons, ctrl.signal).catch(() => []),
      get(TABS.choices, ctrl.signal).catch(() => [])
    ]).then(([cats, items, addons, choices]) => {
      const menu = toMenu({ cats, items, addons, choices });
      if (!menu.length) throw new Error('empty sheet');
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ id, at: Date.now(), menu })); } catch (e) { /* ignore */ }
      return menu;
    }).finally(() => clearTimeout(timer));
  };

  const cached = () => {
    try {
      const c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      return c && c.id === id && Array.isArray(c.menu) && c.menu.length ? c.menu : null;
    } catch (e) { return null; }
  };

  window.menuSource = { enabled: true, cached, load, toMenu, parseCSV };
})();

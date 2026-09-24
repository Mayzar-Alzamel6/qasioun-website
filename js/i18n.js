/**
 * Interface language: Arabic (default) or English.
 *   i18n.lang            'ar' | 'en'
 *   i18n.t(key, vars)    interface text in the current language ({name} placeholders)
 *   i18n.pick(ar, en)    menu text: the English value when there is one, else Arabic
 *   i18n.set(lang)       switch language (saved per device); fires `langchange`
 *                        on document so the menu and hero re-render their text
 * Static page text is marked in index.html: data-i18n (text), data-i18n-ph
 * (placeholder), data-i18n-aria (aria-label). Brand text (data-site) comes
 * from SITE / SITE.*En in js/site.js. Menu content has `en` fields in
 * js/menu-data.js. WhatsApp orders are always written in Arabic for the staff.
 * The EN button shows when SITE.english is true.
 */
(() => {
  const STR = {
    ar: {
      // Page
      skip: 'انتقل إلى المنيو',
      contact: 'تواصل معنا',
      menu: 'المنيو',
      seeMenu: 'شاهد المنيو',
      heroDoneTitle: 'طازجة من فرننا لطاولتك',
      heroDoneText: 'اختار طلبك من المنيو وابعته مباشرة من طاولتك',
      scrollHint: 'مرّر لتشاهد التحضير',
      skipHero: 'تخطَّ للمنيو ←',
      stage0: 'العجينة',
      stage1: 'فرد العجينة',
      stage2: 'الصلصة',
      stage3: 'الجبنة',
      stage4: 'السلامي',
      stage5: 'الزيتون',
      stage6: 'إلى الفرن',
      stage7: 'جاهزة',
      tableLabel: 'طاولة رقم',
      searchPh: 'ابحث عن صنف… مثلاً: كنافة',
      searchLabel: 'ابحث في المنيو',
      empty: 'ما لقينا هالصنف — جرّب كلمة تانية',
      chipsLabel: 'أقسام المنيو',
      viewOrder: 'عرض الطلب',
      yourOrder: 'طلبك',
      doneTitle: 'طلبك جاهز بواتساب',
      doneText: 'اضغط «إرسال» بواتساب ليوصل طلبك للمطعم.',
      backToMenu: 'رجوع للمنيو',
      newOrder: 'طلب جديد',
      tableNumber: 'رقم الطاولة',
      tablePh: 'مثلاً 5',
      tableError: 'اكتب رقم الطاولة لنعرف وين نجيب الطلب',
      notes: 'ملاحظات (اختياري)',
      notesPh: 'مثلاً: بدون بصل، زيادة جبنة…',
      total: 'المجموع',
      send: 'إرسال الطلب عبر واتساب',
      clear: 'تفريغ الطلب',
      whatsapp: 'واتساب',
      instagram: 'إنستغرام',
      facebook: 'فيسبوك',
      waFab: 'تواصل عبر واتساب',
      langSwitch: 'English',
      // Menu
      all: 'الكل',
      from: 'من',
      soldOut: 'نفذ اليوم',
      tag_popular: 'الأكثر طلباً',
      tag_new: 'جديد',
      tag_spicy: 'حار',
      tag_veg: 'نباتي',
      add: 'أضف {name}',
      inc: 'زيادة',
      dec: 'إنقاص',
      inOrder: '{n} بطلبك',
      chooseSize: 'اختر الحجم',
      extras: 'إضافات',
      optional: 'اختياري',
      itemNote: 'ملاحظة للصنف',
      itemNotePh: 'مثلاً: بدون بصل',
      addToOrder: 'أضف للطلب',
      close: 'إغلاق',
      qty: 'الكمية',
      note: 'ملاحظة',
      cartEmpty: 'طلبك فاضي — أضف أصناف من المنيو',
      noWhatsapp: 'رقم واتساب المطعم غير مُعدّ بعد (site-config.js).',
      featured: 'الأكثر طلباً',
      upsell: 'بتحب تضيف؟',
      table: 'طاولة رقم {n}',
      callWaiter: 'نادِ الجرسون',
      askBill: 'اطلب الحساب',
      removedItems: 'بعض الأصناف نفذت وتشالت من طلبك',
      serviceSent: 'رسالتك جاهزة بواتساب — اضغط إرسال',
      prev: 'السابق',
      next: 'التالي'
    },
    en: {
      skip: 'Skip to the menu',
      contact: 'Contact',
      menu: 'Menu',
      seeMenu: 'See the menu',
      heroDoneTitle: 'Fresh from our oven to your table',
      heroDoneText: 'Pick from the menu and send your order right from your table',
      scrollHint: 'Scroll to watch it being made',
      skipHero: 'Skip to the menu →',
      stage0: 'The dough',
      stage1: 'Stretching',
      stage2: 'Sauce',
      stage3: 'Cheese',
      stage4: 'Salami',
      stage5: 'Olives',
      stage6: 'Into the oven',
      stage7: 'Ready',
      tableLabel: 'Table',
      searchPh: 'Search the menu… e.g. kunafa',
      searchLabel: 'Search the menu',
      empty: 'No matches — try another word',
      chipsLabel: 'Menu sections',
      viewOrder: 'View order',
      yourOrder: 'Your order',
      doneTitle: 'Your order is ready in WhatsApp',
      doneText: 'Tap “Send” in WhatsApp so the restaurant gets it.',
      backToMenu: 'Back to the menu',
      newOrder: 'New order',
      tableNumber: 'Table number',
      tablePh: 'e.g. 5',
      tableError: 'Enter your table number so we know where to bring it',
      notes: 'Notes (optional)',
      notesPh: 'e.g. no onions, extra cheese…',
      total: 'Total',
      send: 'Send the order on WhatsApp',
      clear: 'Clear the order',
      whatsapp: 'WhatsApp',
      instagram: 'Instagram',
      facebook: 'Facebook',
      waFab: 'Chat on WhatsApp',
      langSwitch: 'العربية',
      all: 'All',
      from: 'From',
      soldOut: 'Sold out today',
      tag_popular: 'Popular',
      tag_new: 'New',
      tag_spicy: 'Spicy',
      tag_veg: 'Vegetarian',
      add: 'Add {name}',
      inc: 'Increase',
      dec: 'Decrease',
      inOrder: '{n} in your order',
      chooseSize: 'Choose a size',
      extras: 'Extras',
      optional: 'optional',
      itemNote: 'Note for this item',
      itemNotePh: 'e.g. no onions',
      addToOrder: 'Add to order',
      close: 'Close',
      qty: 'Quantity',
      note: 'Note',
      cartEmpty: 'Your order is empty — add something from the menu',
      noWhatsapp: 'The restaurant WhatsApp number is not set yet (site-config.js).',
      featured: 'Most loved',
      upsell: 'Add something?',
      table: 'Table {n}',
      callWaiter: 'Call the waiter',
      askBill: 'Ask for the bill',
      removedItems: 'Some items sold out and were removed from your order',
      serviceSent: 'Your message is ready in WhatsApp — tap send',
      prev: 'Previous',
      next: 'Next'
    }
  };

  const SITE = window.SITE || {};
  const enabled = SITE.english !== false;
  let lang = 'ar';
  try { if (enabled && localStorage.getItem('menu-lang') === 'en') lang = 'en'; } catch (e) { /* storage blocked */ }

  const t = (key, vars) => {
    let s = STR[lang][key] ?? STR.ar[key] ?? key;
    if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
    return s;
  };

  // Static page text + direction
  const apply = () => {
    const html = document.documentElement;
    html.lang = lang;
    html.dir = lang === 'en' ? 'ltr' : 'rtl';
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-ph]').forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
    document.querySelectorAll('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
    document.querySelectorAll('[data-lang-toggle]').forEach((b) => {
      b.hidden = !enabled;
      b.textContent = lang === 'en' ? 'ع' : 'EN';
      b.lang = lang === 'en' ? 'ar' : 'en';
      b.setAttribute('aria-label', t('langSwitch'));
    });
  };

  const set = (next) => {
    if (!enabled || next === lang || !STR[next]) return;
    lang = next;
    try { localStorage.setItem('menu-lang', lang); } catch (e) { /* ignore */ }
    apply();
    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
  };

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-lang-toggle]')) set(lang === 'en' ? 'ar' : 'en');
  });

  window.i18n = {
    STR,
    get lang() { return lang; },
    t,
    pick: (ar, en) => (lang === 'en' && en ? en : ar),
    set
  };
  apply();
})();

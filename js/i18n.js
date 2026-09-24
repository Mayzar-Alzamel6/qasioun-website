/**
 * Interface strings in Arabic and English.
 *   i18n.lang            'ar' | 'en'
 *   i18n.t(key, vars)    interface text in the current language ({name} placeholders)
 *   i18n.pick(ar, en)    menu text: the English value when there is one, else Arabic
 * Menu content (names, descriptions) lives in js/menu-data.js as `en` fields;
 * WhatsApp orders are always written in Arabic for the staff.
 */
(() => {
  const STR = {
    ar: {
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

  let lang = 'ar';
  try { if (localStorage.getItem('menu-lang') === 'en') lang = 'en'; } catch (e) { /* storage blocked */ }

  const t = (key, vars) => {
    let s = STR[lang][key] ?? STR.ar[key] ?? key;
    if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
    return s;
  };

  window.i18n = {
    STR,
    get lang() { return lang; },
    t,
    pick: (ar, en) => (lang === 'en' && en ? en : ar)
  };
})();

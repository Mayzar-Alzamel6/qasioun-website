/**
 * Menu data — DEMO content. Replace with the restaurant's real menu.
 *
 * Each category:
 *   id       unique, latin letters (used in links: #cat-<id>)
 *   title    shown on the banner and the category chip
 *   img      optional banner photo path; without it, `icon` (a name from js/icons.js) is shown
 *   items    [name, price] — price as a string, e.g. '2.50'
 *   cols     optional size/variant columns; then each item is
 *            [name, [price per column]] and null = not available
 *   sizePrefix / orderPrefix  optional: only change how a line reads in
 *            the WhatsApp order, e.g. "ساندويش فلافل (خبز صاج)"
 *   note     optional small note under the category
 */
window.MENU = [
  {
    id: 'pizza', title: 'البيتزا', img: 'assets/img/hero/pizza-baked.webp',
    cols: ['وسط', 'كبير', 'عائلي'],
    items: [
      ['بيتزا مارغريتا', ['3.00', '4.00', '5.00']],
      ['بيتزا خضار', ['3.00', '4.00', '5.00']],
      ['بيتزا سلامي', ['3.50', '4.50', '5.50']],
      ['بيتزا دجاج', ['3.50', '4.50', '5.50']],
      ['بيتزا مشكّل', ['4.00', '5.00', '6.00']]
    ]
  },
  {
    id: 'pastries', title: 'المعجنات', icon: 'croissant',
    items: [
      ['زعتر', '0.50'], ['جبنة', '0.75'], ['جبنة مع زعتر', '0.75'], ['لحمة', '1.00'],
      ['محمرة', '0.75'], ['سبانخ', '1.00'], ['مكس أجبان', '1.25'], ['كروسان شوكولا', '1.00']
    ]
  },
  {
    id: 'sandwiches', title: 'السندويشات', icon: 'sandwich',
    cols: ['عادي', 'صاج'],
    sizePrefix: 'خبز ',
    orderPrefix: 'ساندويش ',
    items: [
      ['فلافل', ['0.75', '1.00']],
      ['بطاطا', ['1.00', '1.25']],
      ['حلومي', ['1.50', '1.75']],
      ['دجاج', ['2.00', '2.50']]
    ],
    note: 'الأسعار حسب نوع الخبز'
  },
  {
    id: 'starters', title: 'المقبلات', icon: 'salad',
    items: [
      ['صحن حمص', '1.50'], ['صحن فول', '1.50'], ['متبل باذنجان', '1.50'],
      ['بطاطا مقلية', '1.50'], ['سلطة موسمية', '2.00']
    ]
  },
  {
    id: 'sweets', title: 'الحلويات', icon: 'cake',
    items: [
      ['كنافة', '1.50'], ['تشيز كيك', '2.00'], ['كيك شوكولا', '2.00'],
      ['مهلبية', '1.50'], ['آيس كريم (طابتين)', '1.25']
    ]
  },
  {
    id: 'hot', title: 'المشروبات الساخنة', icon: 'coffee',
    items: [
      ['شاي', '0.75'], ['قهوة عربية', '1.00'], ['إسبريسو', '1.75'],
      ['كابتشينو', '2.50'], ['لاتيه', '2.50'], ['هوت شوكليت', '2.00']
    ]
  },
  {
    id: 'cold', title: 'المشروبات الباردة', icon: 'cup',
    cols: ['صغير', 'كبير'],
    items: [
      ['عصير برتقال', ['1.75', '2.25']],
      ['ليمون ونعنع', ['1.75', '2.25']],
      ['عصير مانجو', ['2.00', '2.50']],
      ['ميلك شيك', ['2.50', '3.00']],
      ['مياه', ['0.25', null]],
      ['مشروب غازي', ['0.75', null]]
    ]
  }
];

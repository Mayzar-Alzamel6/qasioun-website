/**
 * Menu data — DEMO content. Replace with the restaurant's real menu
 * (or connect a Google Sheet, see js/site-config.js).
 *
 * Category:
 *   id          unique, latin letters (used in links: #cat-<id>)
 *   title, en   name on the banner and the category chip (Arabic, English)
 *   img         optional banner photo; without it `icon` (a name from js/icons.js) is shown
 *   cols, colsEn  optional sizes; then an item's price is a list, one per size
 *               (null = size not available)
 *   addons      optional extras for every item: [name, English, price]
 *   choices     optional pick-one options (no price), first option is the default:
 *               { title, en, options: [[Arabic, English], ...] }
 *   sizePrefix / orderPrefix  only change how a line reads in the WhatsApp
 *               order, e.g. "ساندويش فلافل (خبز صاج)"
 *   note, noteEn  optional small note under the category
 *
 * Item: either the short form ['name', '2.50'] / ['name', ['2.50', '3.00']]
 * or an object:
 *   name, en, desc, descEn
 *   price       '2.50', or a list per size
 *   photo       file name in assets/img/items (without .webp), or a full URL.
 *               Needs <name>.webp (960px) and <name>-sm.webp (320px); until the
 *               files exist a tinted placeholder with the category icon is shown.
 *   tags        any of 'popular', 'new', 'spicy', 'veg'
 *   featured    shown in the "most loved" row
 *   suggest     offered in the cart ("add something?")
 *   soldOut     shown greyed out, can't be ordered
 *   addons / choices   override the category's (false = none)
 */
(() => {
  const SUGAR = { title: 'السكر', en: 'Sugar', options: [['وسط', 'Medium'], ['بدون سكر', 'No sugar'], ['خفيف', 'Light'], ['زيادة', 'Extra sweet']] };
  const COFFEE_EXTRAS = [['شوت إسبريسو إضافي', 'Extra espresso shot', '0.50'], ['حليب شوفان', 'Oat milk', '0.50']];

  window.MENU = [
    {
      id: 'pizza', title: 'البيتزا', en: 'Pizza', img: 'assets/img/hero/pizza-baked.webp', icon: 'pizza',
      cols: ['وسط', 'كبير', 'عائلي'], colsEn: ['Medium', 'Large', 'Family'],
      addons: [['جبنة زيادة', 'Extra cheese', '0.50'], ['فطر', 'Mushrooms', '0.50'], ['زيتون', 'Olives', '0.25'], ['هالبينو', 'Jalapeño', '0.25']],
      items: [
        { name: 'بيتزا مارغريتا', en: 'Margherita', desc: 'صلصة طماطم، موزاريلا وريحان طازج', descEn: 'Tomato sauce, mozzarella and fresh basil',
          price: ['3.00', '4.00', '5.00'], photo: 'pizza-margherita', tags: ['popular', 'veg'], featured: true },
        { name: 'بيتزا خضار', en: 'Veggie', desc: 'فليفلة ملونة، فطر، زيتون، بصل وذرة', descEn: 'Bell peppers, mushrooms, olives, onion and sweetcorn',
          price: ['3.00', '4.00', '5.00'], tags: ['veg'] },
        { name: 'بيتزا سلامي', en: 'Salami', desc: 'سلامي بقري مع موزاريلا وصلصة الطماطم', descEn: 'Beef salami, mozzarella and tomato sauce',
          price: ['3.50', '4.50', '5.50'] },
        { name: 'بيتزا دجاج', en: 'BBQ chicken', desc: 'دجاج متبل، فليفلة، بصل وصوص الباربكيو', descEn: 'Marinated chicken, peppers, onion and BBQ sauce',
          price: ['3.50', '4.50', '5.50'], tags: ['new'] },
        { name: 'بيتزا مشكّل', en: 'Mixed', desc: 'سلامي، دجاج، خضار وجبنة مضاعفة', descEn: 'Salami, chicken, veggies and double cheese',
          price: ['4.00', '5.00', '6.00'], photo: 'pizza-mix' }
      ]
    },
    {
      id: 'pastries', title: 'المعجنات', en: 'Manakish & pastries', img: 'assets/img/menu/pastries.webp', icon: 'croissant',
      addons: [['جبنة زيادة', 'Extra cheese', '0.25'], ['خضار طازجة', 'Fresh veggies', '0.15']],
      items: [
        { name: 'مناقيش زعتر', en: 'Za\'atar manakish', desc: 'زعتر بلدي وزيت زيتون من فرن الطابون', descEn: 'Local za\'atar and olive oil, from the taboon oven',
          price: '0.50', photo: 'manakish-zaatar', tags: ['popular', 'veg'], featured: true },
        { name: 'جبنة', en: 'Cheese', desc: 'جبنة عكاوي وموزاريلا مذوّبة', descEn: 'Melted akkawi and mozzarella',
          price: '0.75', tags: ['veg'] },
        { name: 'جبنة مع زعتر', en: 'Cheese & za\'atar', desc: 'نص جبنة ونص زعتر، أحلى الاتنين', descEn: 'Half cheese, half za\'atar',
          price: '0.75', photo: 'pastry-cheese-zaatar', tags: ['veg'] },
        { name: 'لحمة بعجين', en: 'Lahm bi ajeen', desc: 'لحمة متبلة مع بندورة وبصل ودبس رمان', descEn: 'Spiced minced meat, tomato, onion and pomegranate molasses',
          price: '1.00' },
        { name: 'محمرة', en: 'Muhammara', desc: 'فليفلة حمرا مشوية وجوز ودبس رمان', descEn: 'Roasted red pepper, walnut and pomegranate molasses',
          price: '0.75', tags: ['spicy', 'veg'] },
        { name: 'فطاير سبانخ', en: 'Spinach fatayer', desc: 'سبانخ بالسماق والبصل والليمون', descEn: 'Spinach with sumac, onion and lemon',
          price: '1.00', tags: ['veg'] },
        { name: 'مكس أجبان', en: 'Four cheese', desc: 'عكاوي، موزاريلا، حلوم وقشقوان', descEn: 'Akkawi, mozzarella, halloumi and kashkaval',
          price: '1.25', tags: ['new', 'veg'] },
        { name: 'كروسان شوكولا', en: 'Chocolate croissant', desc: 'كروسان بالزبدة محشي شوكولا', descEn: 'Butter croissant filled with chocolate',
          price: '1.00', addons: false }
      ]
    },
    {
      id: 'sandwiches', title: 'السندويشات', en: 'Sandwiches', img: 'assets/img/menu/sandwiches.webp', icon: 'sandwich',
      cols: ['عادي', 'صاج'], colsEn: ['Regular bread', 'Saj bread'],
      sizePrefix: 'خبز ',
      orderPrefix: 'ساندويش ',
      addons: [['بطاطا داخل الساندويش', 'Fries inside', '0.25'], ['جبنة', 'Cheese', '0.25'], ['صوص ثوم زيادة', 'Extra garlic sauce', '0.10']],
      choices: [{ title: 'الحرّ', en: 'Spice', options: [['عادي', 'Mild'], ['حار', 'Spicy']] }],
      items: [
        { name: 'فلافل', en: 'Falafel', desc: 'فلافل مقرمشة، طحينة، بندورة ومخلل', descEn: 'Crispy falafel, tahini, tomato and pickles',
          price: ['0.75', '1.00'], photo: 'sandwich-falafel', tags: ['veg'] },
        { name: 'بطاطا', en: 'Fries', desc: 'بطاطا مقلية مع ثومية وكاتشب', descEn: 'Fries with garlic sauce and ketchup',
          price: ['1.00', '1.25'], tags: ['veg'] },
        { name: 'حلومي', en: 'Halloumi', desc: 'حلوم مشوي، بندورة، خيار ونعنع', descEn: 'Grilled halloumi, tomato, cucumber and mint',
          price: ['1.50', '1.75'], tags: ['veg'] },
        { name: 'دجاج', en: 'Chicken', desc: 'صدر دجاج متبل ومشوي مع ثومية ومخلل', descEn: 'Marinated grilled chicken, garlic sauce and pickles',
          price: ['2.00', '2.50'], photo: 'sandwich-chicken', tags: ['popular'], featured: true }
      ],
      note: 'الأسعار حسب نوع الخبز', noteEn: 'Price depends on the bread'
    },
    {
      id: 'starters', title: 'المقبلات', en: 'Starters', img: 'assets/img/menu/starters.webp', icon: 'salad',
      items: [
        { name: 'صحن حمص', en: 'Hummus', desc: 'حمص بالطحينة وزيت الزيتون والكمون', descEn: 'Chickpeas with tahini, olive oil and cumin',
          price: '1.50', photo: 'hummus', tags: ['popular', 'veg'] },
        { name: 'صحن فول', en: 'Foul', desc: 'فول مدمس بالليمون والثوم وزيت الزيتون', descEn: 'Fava beans with lemon, garlic and olive oil',
          price: '1.50', tags: ['veg'] },
        { name: 'متبل باذنجان', en: 'Moutabal', desc: 'باذنجان مشوي عالفحم مع طحينة ورمان', descEn: 'Charred eggplant with tahini and pomegranate',
          price: '1.50', tags: ['veg'] },
        { name: 'بطاطا مقلية', en: 'French fries', desc: 'بطاطا مقرمشة مع صوص الثوم', descEn: 'Crispy fries with garlic dip',
          price: '1.50', tags: ['veg'], suggest: true },
        { name: 'سلطة موسمية', en: 'Seasonal salad', desc: 'خضار الموسم مع دبس رمان وزيت زيتون', descEn: 'Seasonal greens, pomegranate molasses and olive oil',
          price: '2.00', tags: ['new', 'veg'] }
      ]
    },
    {
      id: 'sweets', title: 'الحلويات', en: 'Desserts', img: 'assets/img/menu/sweets.webp', icon: 'cake',
      items: [
        { name: 'كنافة', en: 'Kunafa', desc: 'كنافة نابلسية بالجبنة، سخنة مع القطر', descEn: 'Nabulsi cheese kunafa, served warm with syrup',
          price: '1.50', photo: 'kunafa', tags: ['popular'], featured: true, suggest: true },
        { name: 'تشيز كيك', en: 'Cheesecake', desc: 'تشيز كيك كريمي مع صوص التوت', descEn: 'Creamy cheesecake with berry sauce',
          price: '2.00', photo: 'cheesecake', suggest: true },
        { name: 'كيك شوكولا', en: 'Chocolate cake', desc: 'طبقات شوكولا غنية مع غاناش', descEn: 'Rich chocolate layers with ganache',
          price: '2.00' },
        { name: 'مهلبية', en: 'Muhallabia', desc: 'مهلبية بماء الورد والفستق الحلبي', descEn: 'Milk pudding with rose water and pistachio',
          price: '1.50' },
        { name: 'آيس كريم (طابتين)', en: 'Ice cream (2 scoops)', desc: 'فانيلا، شوكولا أو فراولة', descEn: 'Vanilla, chocolate or strawberry',
          price: '1.25',
          choices: [{ title: 'النكهة', en: 'Flavor', options: [['مشكّل', 'Mixed'], ['فانيلا', 'Vanilla'], ['شوكولا', 'Chocolate'], ['فراولة', 'Strawberry']] }] }
      ]
    },
    {
      id: 'hot', title: 'المشروبات الساخنة', en: 'Hot drinks', img: 'assets/img/menu/hot.webp', icon: 'coffee',
      choices: [SUGAR],
      items: [
        { name: 'شاي', en: 'Tea', desc: 'شاي أحمر بالنعنع أو الميرمية', descEn: 'Black tea with mint or sage',
          price: '0.75',
          choices: [SUGAR, { title: 'النكهة', en: 'Flavor', options: [['نعنع', 'Mint'], ['ميرمية', 'Sage'], ['سادة', 'Plain']] }] },
        { name: 'قهوة عربية', en: 'Arabic coffee', desc: 'قهوة بالهيل، محمصة عنا', descEn: 'Cardamom coffee, roasted in-house',
          price: '1.00', tags: ['popular'] },
        { name: 'إسبريسو', en: 'Espresso', desc: 'شوت إسبريسو مزدوج', descEn: 'Double espresso shot',
          price: '1.75', addons: COFFEE_EXTRAS.slice(0, 1) },
        { name: 'كابتشينو', en: 'Cappuccino', desc: 'إسبريسو مع حليب مرغّي ورشة كاكاو', descEn: 'Espresso, milk foam and a dust of cocoa',
          price: '2.50', photo: 'cappuccino', addons: COFFEE_EXTRAS, featured: true, suggest: true },
        { name: 'لاتيه', en: 'Latte', desc: 'إسبريسو مع حليب ناعم', descEn: 'Espresso with silky steamed milk',
          price: '2.50', addons: COFFEE_EXTRAS },
        { name: 'هوت شوكليت', en: 'Hot chocolate', desc: 'شوكولا سخنة غنية مع كريمة', descEn: 'Rich hot chocolate topped with cream',
          price: '2.00', choices: false }
      ]
    },
    {
      id: 'cold', title: 'المشروبات الباردة', en: 'Cold drinks', img: 'assets/img/menu/cold.webp', icon: 'cup',
      cols: ['صغير', 'كبير'], colsEn: ['Small', 'Large'],
      items: [
        { name: 'عصير برتقال', en: 'Orange juice', desc: 'برتقال طازج معصور عالطلب', descEn: 'Freshly squeezed to order',
          price: ['1.75', '2.25'] },
        { name: 'ليمون ونعنع', en: 'Lemon & mint', desc: 'ليمون طازج مع نعنع مثلّج', descEn: 'Fresh lemon blended with mint and ice',
          price: ['1.75', '2.25'], photo: 'lemon-mint', tags: ['popular'], featured: true, suggest: true },
        { name: 'عصير مانجو', en: 'Mango juice', desc: 'مانجو طبيعي كثيف', descEn: 'Thick natural mango',
          price: ['2.00', '2.50'], tags: ['new'] },
        { name: 'ميلك شيك', en: 'Milkshake', desc: 'مع آيس كريم وكريمة', descEn: 'Made with ice cream and topped with cream',
          price: ['2.50', '3.00'], photo: 'milkshake',
          choices: [{ title: 'النكهة', en: 'Flavor', options: [['فانيلا', 'Vanilla'], ['شوكولا', 'Chocolate'], ['فراولة', 'Strawberry']] }] },
        { name: 'مياه', en: 'Water', price: ['0.25', null] },
        { name: 'مشروب غازي', en: 'Soft drink', desc: 'كولا، ليمون أو برتقال', descEn: 'Cola, lemon-lime or orange',
          price: ['0.75', null], suggest: true,
          choices: [{ title: 'النوع', en: 'Flavor', options: [['كولا', 'Cola'], ['ليمون', 'Lemon-lime'], ['برتقال', 'Orange']] }] }
      ]
    }
  ];
})();

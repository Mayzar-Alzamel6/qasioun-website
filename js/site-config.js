/**
 * ============================================================
 *  Restaurant settings — the ONE file to edit for a new client
 * ============================================================
 * Everything brand-specific on the page (name, logo, contact details,
 * currency, colors) is read from here by js/site.js. The menu itself
 * lives in js/menu-data.js.
 *
 * Also update by hand in index.html (crawlers don't run JS):
 *   <title>, meta description, og:* / twitter:* tags (use absolute URLs).
 */
window.SITE = {
  // Full name (hero, footer, copyright) and short name (navbar, logo letter)
  name: 'مخبز طابون',
  shortName: 'طابون',

  // Hero headline + the line under the name
  slogan: 'من الطابون… لطاولتك',
  tagline: 'بيتزا، مناقيش وحلويات طازجة من فرننا كل يوم',

  // English version of the page: the EN button in the navbar. Each text
  // above/below has an *En twin; menu items use their `en` fields.
  // Set english: false to hide the button.
  english: true,
  nameEn: 'Taboon Bakery',
  shortNameEn: 'Taboon',
  sloganEn: 'From the taboon… to your table',
  taglineEn: 'Pizza, manakish and sweets, fresh from our oven every day',

  // Logo image path (square, ideally transparent WebP/PNG), e.g.
  // 'assets/img/logo/logo.webp'. Leave empty to show a colored circle with
  // the first letter of shortName instead.
  logo: '',

  // Contact / footer
  address: 'عنوان المطعم، المدينة',
  hours: 'يومياً من 9 صباحاً حتى 12 منتصف الليل',
  addressEn: 'Restaurant address, City',
  hoursEn: 'Daily, 9 AM to midnight',
  phones: [
    { display: '079 504 2469', tel: '+962795042469' }
  ],

  // WhatsApp number that receives table orders: international format,
  // digits only, no "+" or leading zeros (e.g. Jordan 079xxxxxxx -> 96279xxxxxxx).
  whatsapp: '962795042469',

  // Social links: full URLs, or '' to hide the button
  instagram: '',
  facebook: '',

  // Prices
  currency: 'د.أ',
  currencyNote: 'الأسعار بالدينار الأردني',
  currencyEn: 'JOD',
  currencyNoteEn: 'Prices in Jordanian dinars',

  // Brand colors (CSS custom properties on :root)
  theme: {
    '--accent': '#D9432B',      // buttons, prices highlights, logo circle
    '--accent-dark': '#B8331E', // hover/pressed
    '--accent-soft': '#FBE3DD', // light tint (table badge, notes)
    '--bg': '#F6F0E6'           // page background
  }
};

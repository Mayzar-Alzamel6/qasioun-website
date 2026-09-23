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
  name: 'اسم المطعم',
  shortName: 'مطعمك',

  // Hero headline + the line under the name
  slogan: 'من فرننا… لطاولتك',
  tagline: 'بيتزا، معجنات وحلويات طازجة كل يوم',

  // Logo image path (square, ideally transparent WebP/PNG), e.g.
  // 'assets/img/logo/logo.webp'. Leave empty to show a gold circle with
  // the first letter of shortName instead.
  logo: '',

  // Contact / footer
  address: 'عنوان المطعم، المدينة',
  hours: 'يومياً من 9 صباحاً حتى 12 منتصف الليل',
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

  // Brand colors (CSS custom properties on :root)
  theme: {
    '--color-bg-deep': '#220C00',
    '--color-bg-mid': '#301B00',
    '--color-gold': '#E5D26F',
    '--color-cream': '#FFFEF7'
  }
};

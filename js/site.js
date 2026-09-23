/**
 * Applies window.SITE (js/site-config.js) to the page: brand text, logo,
 * contact links and theme colors. Runs synchronously at the end of <body>,
 * before main.js / menu.js, so everything is in place before first paint.
 *
 * Markup hooks:
 *   data-site="key"   -> textContent from SITE[key] (plus "copyright")
 *   data-site-logo    -> logo <img>, or a monogram when SITE.logo is empty
 *   data-social="x"   -> href for whatsapp / instagram / facebook (hidden if empty)
 *   .footer__phones   -> filled from SITE.phones
 */
(() => {
  const S = window.SITE || {};

  // Theme colors
  Object.entries(S.theme || {}).forEach(([prop, value]) => {
    document.documentElement.style.setProperty(prop, value);
  });

  // Plain text bindings
  const text = { ...S, copyright: `© ${new Date().getFullYear()} ${S.name || ''}` };
  document.querySelectorAll('[data-site]').forEach((el) => {
    const v = text[el.dataset.site];
    if (typeof v === 'string' && v) el.textContent = v;
  });
  if (S.name) document.title = `${S.name} | المنيو`;

  // Logo or monogram (first letter of the short name)
  const letter = (S.shortName || S.name || '•').trim().charAt(0);
  document.querySelectorAll('[data-site-logo]').forEach((el) => {
    el.textContent = '';
    if (S.logo) {
      const img = document.createElement('img');
      img.src = S.logo;
      img.alt = el.dataset.siteLogo === 'labelled' ? `شعار ${S.name || ''}` : '';
      el.appendChild(img);
    } else {
      const mark = document.createElement('span');
      mark.className = 'monogram';
      mark.textContent = letter;
      mark.setAttribute('aria-hidden', 'true');
      el.appendChild(mark);
    }
  });

  // Phones
  const phones = document.querySelector('.footer__phones');
  if (phones) {
    phones.textContent = '';
    (S.phones || []).forEach(({ display, tel }) => {
      const a = document.createElement('a');
      a.href = `tel:${tel}`;
      a.dir = 'ltr';
      a.textContent = display;
      phones.appendChild(a);
    });
    phones.hidden = !phones.children.length;
  }

  // WhatsApp / social links
  const links = {
    whatsapp: S.whatsapp ? `https://wa.me/${S.whatsapp}` : '',
    instagram: S.instagram || '',
    facebook: S.facebook || ''
  };
  document.querySelectorAll('[data-social]').forEach((a) => {
    const href = links[a.dataset.social];
    if (href) a.href = href;
    else a.hidden = true;
  });
})();

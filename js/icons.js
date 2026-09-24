/**
 * Line icons (24x24, stroke = currentColor) used instead of emoji.
 * icon(name, className?) returns an inline <svg> string.
 * Category icons are referenced by name from js/menu-data.js (`icon`).
 */
(() => {
  const P = {
    pizza: '<path d="M12 21 3.5 5.5a15 15 0 0 1 17 0Z"/><path d="M5.2 8.6a12 12 0 0 1 13.6 0"/><circle cx="10" cy="10.5" r="1.2"/><circle cx="14" cy="12.5" r="1.2"/><circle cx="11.8" cy="16" r="1"/>',
    croissant: '<path d="M4.5 16.5c-1.8-3 .2-7.5 4.2-9.6"/><path d="M19.5 16.5c1.8-3-.2-7.5-4.2-9.6"/><path d="M8.7 6.9C10.9 5.7 13.1 5.7 15.3 6.9L14 17.8a2 2 0 0 1-4 0Z"/><path d="M8.7 6.9 6.3 17.4"/><path d="M15.3 6.9l2.4 10.5"/>',
    sandwich: '<path d="M3 10.5 12 5l9 5.5"/><path d="M3.5 13.5h17"/><path d="M4 16.5c2 1 3.3-1 5 0s3 1 5 0 3.3-1 6 0"/><path d="M3.5 10.5v2.5M20.5 10.5v2.5"/>',
    salad: '<path d="M3 11h18a9 9 0 0 1-18 0Z"/><path d="M7 11a3 3 0 0 1 5-3 3 3 0 0 1 5 3"/><path d="M12 8V5.5"/><path d="M9 20h6"/>',
    cake: '<path d="M4 20V12.5a1.5 1.5 0 0 1 1.5-1.5h13a1.5 1.5 0 0 1 1.5 1.5V20"/><path d="M4 15.5c1.6 1.2 3.2 1.2 4.8 0s3.2-1.2 4.8 0 3.2 1.2 4.8 0"/><path d="M3 20h18"/><path d="M12 11V8"/><path d="M12 5.5c.9-.9.9-1.8 0-2.5-.9.7-.9 1.6 0 2.5Z"/>',
    coffee: '<path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5Z"/><path d="M17 10.5h1.5a2.5 2.5 0 0 1 0 5H17"/><path d="M3 21h16"/><path d="M8 3.5c-.8 1 .8 2 0 3M12 3.5c-.8 1 .8 2 0 3"/>',
    cup: '<path d="M6 7h12l-1.4 13.2a2 2 0 0 1-2 1.8H9.4a2 2 0 0 1-2-1.8Z"/><path d="M5 7h14"/><path d="M13 7l2-5 3 1"/><path d="M7 12h10"/>',
    dish: '<path d="M3 16h18"/><path d="M4.5 16a7.5 7.5 0 0 1 15 0"/><path d="M12 8.5V7"/><path d="M5 19h14"/>',
    table: '<path d="M3 9h18"/><path d="M5 9v11M19 9v11"/><path d="M8 5h8"/><path d="M12 5v4"/>',
    pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21Z"/><circle cx="12" cy="10" r="2.3"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    // Item tags
    star: '<path d="m12 3.5 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8Z"/>',
    leaf: '<path d="M5.5 19.5C4 11 9 5 19.5 4.5 19 15 13 20 5.5 19.5Z"/><path d="M5.5 19.5C8.5 15 11.5 12 15 9.5"/>',
    chili: '<path d="M9 8c-3 3.5-3.4 8.6.6 11.4 2.8 2 7.4 1.2 9.9-1.6-4.3.3-7.3-1.9-8.3-6-.4-1.6-.4-3-2.2-3.8Z"/><path d="M9 8c.2-2 1.4-3.3 3.2-3.8"/><path d="M12.2 4.2c.5 1 1.5 1.6 2.6 1.5"/>',
    spark: '<path d="M12 3.5 13.8 10.2 20.5 12l-6.7 1.8L12 20.5l-1.8-6.7L3.5 12l6.7-1.8Z"/>',
    // Interface
    bell: '<path d="M6 16.5v-5a6 6 0 0 1 12 0v5l1.5 2h-15Z"/><path d="M10 21a2 2 0 0 0 4 0"/>',
    receipt: '<path d="M6 3h12v18l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4L6 21Z"/><path d="M9 8h6M9 12h6M9 16h3.5"/>',
    globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/><path d="M12 3.5c2.4 2.3 3.6 5.2 3.6 8.5s-1.2 6.2-3.6 8.5c-2.4-2.3-3.6-5.2-3.6-8.5s1.2-6.2 3.6-8.5Z"/>',
    close: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    chevron: '<path d="m9.5 6 6 6-6 6"/>'
  };

  window.icon = (name, className = 'icon') =>
    `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || P.dish}</svg>`;
})();

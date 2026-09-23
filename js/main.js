/**
 * Restaurant QR menu template — hero animation
 * GSAP + ScrollTrigger Timeline for Cinematic Pizza Hero Scene
 */

document.addEventListener('DOMContentLoaded', () => {
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }

  // Reduced-motion users, or GSAP failed to load from the CDN: show the final
  // baked state (CSS .static-hero) instead of building the scroll timeline.
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    document.documentElement.classList.add('static-hero');
    return;
  }

  // Register GSAP ScrollTrigger plugin
  gsap.registerPlugin(ScrollTrigger);

  // Mobile browsers resize the viewport when the address bar shows/hides
  // while scrolling; re-measuring the pin then made the scene jump.
  ScrollTrigger.config({ ignoreMobileResize: true });

  // Decode every hero image up front: layers start at opacity 0, so the
  // browser would otherwise decode each ~1000px WebP the first time it
  // appears mid-scroll, causing a visible hitch per topping.
  document.querySelectorAll('.hero img').forEach((img) => {
    if (img.decode) img.decode().catch(() => {});
  });

  const hero = document.querySelector('.hero');
  const stack = document.querySelector('.hero__stack');
  const ovenGlow = document.querySelector('.hero__oven-glow');
  const glowSharp = ovenGlow.querySelector('.glow-sharp');
  const shadow = document.querySelector('.hero__shadow');
  const headline = document.querySelector('.hero__headline');
  const scrollHint = document.querySelector('.hero__scroll-hint');
  const menuBtn = document.querySelector('.hero__menu-btn');
  const layer = (name) => document.querySelector(`.hero__layer[data-layer="${name}"]`);

  // Initial layer properties:
  // Note: dough-flat and sauce-layer have a 1.301 scale relative to cheese/salami/olives
  // so their pizza crust ring matches the toppings diameter with 100% precision.
  // xPercent: -50, yPercent: -50 ensures GSAP preserves center-point alignment on (left, top).
  gsap.set(layer('dough-ball'), { opacity: 0, y: '-140%', xPercent: -50, yPercent: -50 });
  gsap.set(layer('dough-flat'), { opacity: 0, scale: 1.30, xPercent: -50, yPercent: -50 });
  gsap.set(layer('sauce'),      { opacity: 0, scale: 1.30, xPercent: -50, yPercent: -50 });
  gsap.set(
    [
      layer('cheese'),
      layer('salami'),
      layer('olives'),
      layer('baked')
    ],
    { opacity: 0, scale: 1.0, xPercent: -50, yPercent: -50 }
  );
  gsap.set(stack, { opacity: 1, x: '0%', y: '0%', scale: 1 });
  gsap.set(ovenGlow, { opacity: 0.5 });
  gsap.set(glowSharp, { opacity: 0 });
  gsap.set(shadow, { opacity: 0 });
  gsap.set(menuBtn, { opacity: 0, scale: 0.85, pointerEvents: 'none' });

  // Stages (timeline time -> name). Drives the mobile progress bar label and
  // the desktop step list (.hero__steps, built here from the same data).
  const progressFill = document.querySelector('.hero__progress-fill');
  const progressLabel = document.querySelector('.hero__progress-label');
  const stepsList = document.querySelector('.hero__steps');
  const stages = [
    [0.5, 'العجينة'],
    [1.8, 'فرد العجينة'],
    [2.8, 'الصلصة'],
    [3.8, 'الجبنة'],
    [4.8, 'السلامي'],
    [5.8, 'الزيتون'],
    [6.8, 'إلى الفرن'],
    [8.9, 'جاهزة']
  ];
  stepsList.innerHTML = stages.map(([, name]) => `<li>${name}</li>`).join('');
  const stepItems = [...stepsList.children];

  let currentStage = -2;
  const updateProgress = () => {
    progressFill.style.transform = `scaleX(${tl.progress()})`;
    const t = tl.time();
    let idx = -1;
    stages.forEach(([at], i) => { if (t >= at) idx = i; });
    if (idx === currentStage) return;
    currentStage = idx;
    progressLabel.textContent = idx < 0 ? 'مرّر لتشاهد التحضير' : stages[idx][1];
    stepItems.forEach((li, i) => {
      li.classList.toggle('is-done', i < idx);
      li.classList.toggle('is-current', i === idx);
    });
  };

  // Main scroll-driven timeline pinned across 420vh
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: '.hero',
      start: 'top top',
      end: '+=420%',
      scrub: 0.6, // shorter catch-up: the scene follows the finger more tightly
      pin: '.hero__pin-wrap',
      anticipatePin: 1,
      onLeaveBack: () => {
        hero.classList.remove('is-baked');
      }
    },
    onUpdate: updateProgress
  });

  // 0) Rest State -> Initial Scroll: Headline and scroll hint fade out
  tl.to(headline, { opacity: 0, y: -35, duration: 0.5 }, 0.2)
    .to(scrollHint, { opacity: 0, duration: 0.4 }, 0.2)

    // 1) Step 1: Dough ball drops onto the wooden board with bounce
    .to(layer('dough-ball'), {
      y: '0%',
      opacity: 1,
      xPercent: -50,
      yPercent: -50,
      duration: 1.0,
      ease: 'bounce.out'
    }, 0.5)

    // 2) Step 2: Dough self-flattening (crossfade from dough ball into flat disc)
    .to(layer('dough-ball'), { opacity: 0, scale: 1.15, xPercent: -50, yPercent: -50, duration: 0.65 }, 1.8)
    .fromTo(
      layer('dough-flat'),
      { opacity: 0, scale: 1.05, xPercent: -50, yPercent: -50 },
      { opacity: 1, scale: 1.30, xPercent: -50, yPercent: -50, duration: 0.65, ease: 'power1.out' },
      1.8
    )

    // Contact shadow appears with the flat disc
    .to(shadow, { opacity: 1, duration: 0.65 }, 1.8)

    // 3-6) Toppings: see spread() below

    // 7) Oven ignites, pizza slides toward it and shrinks (entry).
    // Opacity-only crossfade to the sharp glow copy (no filter tweening).
    .to(ovenGlow, { opacity: 1, duration: 0.9 }, 6.8)
    .to(glowSharp, { opacity: 1, duration: 0.9 }, 6.8)
    .to(stack, {
      x: '20%',
      y: '-26%',
      scale: 0.34,
      duration: 1.3,
      ease: 'power2.in'
    }, 6.8)

    // 7b) Pizza disappears into the oven opening
    .to(stack, { opacity: 0, duration: 0.3 }, 8.1)

    // While hidden, swap the visible layer from raw "olives" to "baked" (instant, no crossfade
    // needed since nothing is visible at this moment)
    .set(layer('olives'), { opacity: 0, xPercent: -50, yPercent: -50 }, 8.4)
    .set(layer('baked'),  { opacity: 1, xPercent: -50, yPercent: -50 }, 8.4)

    // 7c) Brief pause while "baking" inside, hidden (~0.5 timeline units)

    // 8) Pizza exits with a REVERSE of the entry motion: starts back at the oven's position/scale
    // (invisible), animates outward to center at full scale while fading in
    .fromTo(stack,
      { x: '20%', y: '-26%', scale: 0.34, opacity: 0 },
      { x: '0%',  y: '0%',   scale: 1,    opacity: 1, duration: 1.2, ease: 'power2.out', immediateRender: false },
      8.9
    )
    .to(ovenGlow, { opacity: 0.6, duration: 0.8 }, 9.5)
    .to(glowSharp, { opacity: 0.55, duration: 0.8 }, 9.5)

    // Steam activation & CTA Menu Button reveal (after pizza is fully on the board)
    .to(hero, {
      duration: 0.01,
      onStart: () => hero.classList.add('is-baked'),
      onReverseComplete: () => hero.classList.remove('is-baked')
    }, 10.2)
    .to(menuBtn, {
      opacity: 1,
      scale: 1.0,
      duration: 0.6,
      ease: 'back.out(1.6)',
      onStart: () => { menuBtn.style.pointerEvents = 'auto'; },
      onReverseComplete: () => { menuBtn.style.pointerEvents = 'none'; }
    }, 10.4)
    .to('.hero__skip', { autoAlpha: 0, duration: 0.3 }, 10.2)
    .fromTo('.hero__done',
      { autoAlpha: 0, y: 24 },
      { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power2.out', immediateRender: false },
      10.2
    );

  // 3-6) Each topping spreads outward from the pizza's center: the next
  // (cumulative) layer is shown through a growing radial mask (--r, see
  // .hero__layer in CSS) over the current one, which is hidden once covered.
  const spread = (from, to, at, duration = 0.8) => {
    tl.set(layer(to), { opacity: 1, '--r': '0%' }, at)
      .to(layer(to), { '--r': '120%', duration, ease: 'power1.inOut' }, at)
      .set(layer(from), { opacity: 0 }, at + duration);
  };
  spread('dough-flat', 'sauce', 2.8);
  spread('sauce', 'cheese', 3.8);
  spread('cheese', 'salami', 4.8, 0.7);
  spread('salami', 'olives', 5.8, 0.7);

  // Deep links (e.g. the table QR code -> /#menu): the browser jumps to the
  // anchor before the pin spacer exists, so re-jump once layout is final.
  window.addEventListener('load', () => {
    const target = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (!target) return;
    ScrollTrigger.refresh();
    target.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
});

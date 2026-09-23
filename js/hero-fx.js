/**
 * Living hero scene: one <canvas> (.hero__fx) drawn on gsap.ticker.
 *   - embers rising from the oven mouth + a flickering warm light there
 *   - flour dust drifting over the board, and a flour burst when the dough lands
 *
 * API used by main.js:  heroFx.setHeat(0..1), heroFx.setDust(0..1), heroFx.flourBurst()
 *
 * Performance: sprites are pre-rendered once (no shadowBlur per frame), the canvas
 * is drawn at 1x, particle counts are small, and drawing stops whenever the
 * hero is off-screen or the tab is hidden. Disabled for reduced motion and
 * the static hero (no GSAP).
 */
(() => {
  const noop = { setHeat() {}, setDust() {}, flourBurst() {} };
  window.heroFx = noop;

  const canvas = document.querySelector('.hero__fx');
  if (!canvas) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!window.gsap || reduced || document.documentElement.classList.contains('static-hero')) {
    canvas.remove();
    return;
  }

  const ctx = canvas.getContext('2d');
  let W = 0, H = 0;
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    // Particles are soft blurs: 1x backing store looks the same and costs
    // less than half the pixels of 1.5x (measured ~5ms/frame at 4x CPU throttle).
    const dpr = 1;
    W = r.width; H = r.height;
    canvas.width = Math.max(1, Math.round(W * dpr));
    canvas.height = Math.max(1, Math.round(H * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  // Pre-rendered radial sprites
  const sprite = (size, stops) => {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    stops.forEach(([at, color]) => gr.addColorStop(at, color));
    g.fillStyle = gr;
    g.fillRect(0, 0, size, size);
    return c;
  };
  const EMBER = sprite(32, [[0, 'rgba(255,244,200,1)'], [0.3, 'rgba(255,150,40,0.7)'], [1, 'rgba(255,80,0,0)']]);
  const FLOUR = sprite(24, [[0, 'rgba(255,252,242,0.95)'], [0.45, 'rgba(255,250,236,0.35)'], [1, 'rgba(255,250,236,0)']]);
  const GLOW = sprite(256, [[0, 'rgba(255,170,70,0.9)'], [0.4, 'rgba(255,110,20,0.35)'], [1, 'rgba(255,90,0,0)']]);

  const small = window.innerWidth < 600;
  const MAX_EMBERS = small ? 22 : 36;
  const embers = [];
  const burst = [];
  const dust = [];

  // Oven mouth: measured from the oven-glow image (center, a bit below middle)
  // so it follows the layout on every screen size.
  const glowEl = document.querySelector('.hero__oven-glow');
  let M = { x: 0, y: 0, r: 60 };
  const measureMouth = () => {
    const c = canvas.getBoundingClientRect();
    const g = glowEl ? glowEl.getBoundingClientRect() : { left: c.left + W * 0.55, top: c.top, width: W * 0.45, height: W * 0.45 };
    M = { x: g.left - c.left + g.width * 0.5, y: g.top - c.top + g.height * 0.58, r: g.width * 0.28 };
  };
  const mouth = () => M;

  const rand = (a, b) => a + Math.random() * (b - a);
  // Embers drift up and toward the page center, over the dark headline band
  const newEmber = () => ({
    x: M.x + rand(-M.r, M.r), y: M.y + rand(-M.r * 0.3, M.r * 0.4),
    vx: -rand(8, 34), vy: -rand(14, 42),
    life: 0, max: rand(1.6, 3.2), size: rand(2.5, 6), wob: rand(0, 6.28)
  });

  const seedDust = () => {
    dust.length = 0;
    for (let i = 0; i < (small ? 12 : 18); i++) {
      dust.push({
        x: rand(0, W), y: rand(H * 0.3, H * 0.78),
        vx: rand(-5, 5), vy: rand(-3, 2), size: rand(2.5, 5),
        a: rand(0.2, 0.45), ph: rand(0, 6.28)
      });
    }
  };

  let heat = 0.15, heatTarget = 0.15;
  let dustLevel = 1, dustTarget = 1;
  let emberAcc = 0, time = 0;

  // Slow, soft particles look the same at ~30fps: render every other tick
  // (the pizza timeline itself still runs every frame).
  let skip = false, pendingMs = 0;
  const draw = (_, deltaMs) => {
    pendingMs += deltaMs;
    skip = !skip;
    if (skip) return;
    const dt = Math.min(pendingMs / 1000, 0.08);
    pendingMs = 0;
    time += dt;
    heat += (heatTarget - heat) * Math.min(1, dt * 3);
    dustLevel += (dustTarget - dustLevel) * Math.min(1, dt * 3);
    ctx.clearRect(0, 0, W, H);

    // Warm, flickering light at the oven mouth
    ctx.globalCompositeOperation = 'lighter';
    const m = mouth();
    const flicker = 0.78 + 0.22 * Math.sin(time * 9.1) * Math.sin(time * 5.3 + 1.7);
    const gr = W * (0.34 + heat * 0.2);
    ctx.globalAlpha = (0.12 + heat * 0.38) * flicker;
    ctx.drawImage(GLOW, m.x - gr, m.y - gr, gr * 2, gr * 2);

    // Embers
    emberAcc += dt * (3 + heat * 24);
    while (emberAcc > 1) {
      emberAcc -= 1;
      if (embers.length < MAX_EMBERS * (0.35 + heat * 0.65)) embers.push(newEmber());
    }
    for (let i = embers.length - 1; i >= 0; i--) {
      const e = embers[i];
      e.life += dt;
      if (e.life >= e.max) { embers.splice(i, 1); continue; }
      e.x += e.vx * dt + Math.sin(time * 3 + e.wob) * 0.35;
      e.y += e.vy * dt;
      const k = e.life / e.max;
      ctx.globalAlpha = (k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85) * (0.55 + heat * 0.45);
      const s = e.size * (1 - k * 0.5);
      ctx.drawImage(EMBER, e.x - s, e.y - s, s * 2, s * 2);
    }
    ctx.globalCompositeOperation = 'source-over';

    // Floating flour dust (fades out as the oven takes over)
    if (dustLevel > 0.02) {
      for (const d of dust) {
        d.x += (d.vx + Math.sin(time * 0.7 + d.ph) * 3) * dt;
        d.y += (d.vy + Math.cos(time * 0.5 + d.ph) * 2) * dt;
        if (d.x < -10) d.x = W + 10; else if (d.x > W + 10) d.x = -10;
        if (d.y < H * 0.25) d.y = H * 0.8; else if (d.y > H * 0.85) d.y = H * 0.3;
        ctx.globalAlpha = d.a * dustLevel * (0.7 + 0.3 * Math.sin(time * 1.3 + d.ph));
        ctx.drawImage(FLOUR, d.x - d.size, d.y - d.size, d.size * 2, d.size * 2);
      }
    }

    // Flour burst (gravity + drag)
    for (let i = burst.length - 1; i >= 0; i--) {
      const p = burst[i];
      p.life += dt;
      if (p.life >= p.max) { burst.splice(i, 1); continue; }
      p.vy += 120 * dt;
      p.vx *= 0.97; p.vy *= 0.97;
      p.x += p.vx * dt; p.y += p.vy * dt;
      ctx.globalAlpha = 0.85 * (1 - p.life / p.max);
      ctx.drawImage(FLOUR, p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
    }
    ctx.globalAlpha = 1;
  };

  // Only draw while the hero is on screen and the tab is visible
  let onScreen = false, running = false;
  const sync = () => {
    const want = onScreen && !document.hidden;
    if (want && !running) { gsap.ticker.add(draw); running = true; }
    else if (!want && running) { gsap.ticker.remove(draw); running = false; ctx.clearRect(0, 0, W, H); }
  };
  new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; sync(); }).observe(canvas);
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('resize', () => { resize(); measureMouth(); seedDust(); });
  resize();
  measureMouth();
  seedDust();

  window.heroFx = {
    setHeat(v) { heatTarget = Math.max(0, Math.min(1, v)); },
    setDust(v) { dustTarget = Math.max(0, Math.min(1, v)); },
    flourBurst() {
      const cx = W * 0.46, cy = H * 0.52;
      for (let i = 0; i < (small ? 34 : 48); i++) {
        const a = rand(Math.PI * 1.05, Math.PI * 1.95); // mostly upward/outward
        const sp = rand(40, 170);
        burst.push({
          x: cx + rand(-W * 0.08, W * 0.08), y: cy + rand(-6, 10),
          vx: Math.cos(a) * sp * 1.4, vy: Math.sin(a) * sp,
          life: 0, max: rand(0.8, 1.6), size: rand(2, 5.5)
        });
      }
    }
  };
})();

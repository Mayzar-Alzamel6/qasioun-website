/**
 * Category moments: a short (~2s) particle scene over a category banner,
 * played once when its chip is tapped. Each category id has its own recipe
 * (fire for pizza, flour for pastries, steam for hot drinks...), unknown ids
 * get a generic sparkle, so new categories still work.
 *
 * API used by menu.js:  catFx.play(bannerEl, id)
 *
 * Performance: one canvas at a time, 1x resolution, pre-rendered sprites,
 * drawn on gsap.ticker only while particles are alive, then removed.
 * Disabled for reduced motion or when GSAP is missing.
 */
(() => {
  window.catFx = { play() {} };
  if (!window.gsap || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const rand = (a, b) => a + Math.random() * (b - a);
  const TAU = Math.PI * 2;

  const make = (w, h, paint) => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    paint(c.getContext('2d'), w, h);
    return c;
  };
  const soft = (size, stops) => make(size, size, (g, s) => {
    const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    stops.forEach(([at, col]) => gr.addColorStop(at, col));
    g.fillStyle = gr; g.fillRect(0, 0, s, s);
  });

  const S = {
    ember: soft(32, [[0, 'rgba(255,244,200,1)'], [0.3, 'rgba(255,150,40,.75)'], [1, 'rgba(255,80,0,0)']]),
    glow: soft(256, [[0, 'rgba(255,160,60,.85)'], [0.45, 'rgba(255,100,20,.3)'], [1, 'rgba(255,90,0,0)']]),
    flour: soft(24, [[0, 'rgba(255,252,242,.95)'], [0.45, 'rgba(255,250,236,.4)'], [1, 'rgba(255,250,236,0)']]),
    sugar: soft(12, [[0, 'rgba(255,255,255,1)'], [0.5, 'rgba(255,255,255,.6)'], [1, 'rgba(255,255,255,0)']]),
    steam: soft(128, [[0, 'rgba(255,255,255,.55)'], [0.5, 'rgba(255,255,255,.18)'], [1, 'rgba(255,255,255,0)']]),
    smoke: soft(96, [[0, 'rgba(210,200,190,.45)'], [1, 'rgba(210,200,190,0)']]),
    leaf: make(28, 16, (g) => {
      g.fillStyle = '#5E9E3A';
      g.beginPath(); g.moveTo(1, 8); g.quadraticCurveTo(14, -3, 27, 8); g.quadraticCurveTo(14, 19, 1, 8); g.fill();
      g.strokeStyle = 'rgba(220,255,200,.6)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(3, 8); g.lineTo(24, 8); g.stroke();
    }),
    leafDark: make(28, 16, (g) => {
      g.fillStyle = '#3F7A2A';
      g.beginPath(); g.moveTo(1, 8); g.quadraticCurveTo(14, -1, 27, 8); g.quadraticCurveTo(14, 17, 1, 8); g.fill();
    }),
    ice: make(40, 40, (g) => {
      g.fillStyle = 'rgba(225,245,255,.35)';
      g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 2;
      g.beginPath(); g.roundRect(5, 5, 30, 30, 7); g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.8)';
      g.beginPath(); g.roundRect(10, 9, 9, 4, 2); g.fill();
    }),
    bubble: make(24, 24, (g) => {
      g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 1.5;
      g.beginPath(); g.arc(12, 12, 9, 0, TAU); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.7)';
      g.beginPath(); g.arc(8.5, 8.5, 2, 0, TAU); g.fill();
    }),
    star: make(32, 32, (g) => {
      const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,240,210,0)');
      g.fillStyle = gr;
      g.beginPath(); g.moveTo(16, 0); g.lineTo(18, 14); g.lineTo(32, 16); g.lineTo(18, 18);
      g.lineTo(16, 32); g.lineTo(14, 18); g.lineTo(0, 16); g.lineTo(14, 14); g.closePath(); g.fill();
    })
  };

  /*
   * A recipe: emit(p, W, H) returns one new particle; rate = particles/second
   * during `emitFor` seconds; burst = particles created at once; bg(ctx, k)
   * draws a full-banner layer (k = 0..1 over the whole scene).
   * Particle fields: x y vx vy g (gravity) drag life max size a img
   *                  rot vr sway grow add (additive blend)
   */
  const R = {
    pizza: {
      rate: 40, emitFor: 1.3,
      bg: (ctx, k, W, H) => {
        const a = Math.sin(Math.min(1, k * 1.6) * Math.PI) * (0.75 + 0.25 * Math.sin(k * 60));
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = a * 0.7;
        const r = Math.max(W, H) * 0.7;
        ctx.drawImage(S.glow, W * 0.3 - r, H - r * 0.7, r * 2, r * 2);
      },
      emit: (W, H) => ({
        x: rand(0, W), y: H + 6, vx: rand(-20, 20), vy: -rand(70, 160), g: -20,
        max: rand(1, 1.9), size: rand(2.5, 6), img: S.ember, add: true, sway: rand(0.4, 1.2)
      })
    },
    pastries: {
      burst: 70,
      emit: (W, H) => {
        const a = rand(Math.PI * 1.1, Math.PI * 1.9), sp = rand(80, 260);
        return {
          x: W * 0.5 + rand(-W * 0.12, W * 0.12), y: H * 0.7, vx: Math.cos(a) * sp * 1.5, vy: Math.sin(a) * sp,
          g: 140, drag: 0.965, max: rand(1.4, 2.4), size: rand(3, 8), img: S.flour, a: 0.9
        };
      }
    },
    sandwiches: {
      rate: 26, emitFor: 1.2,
      bg: (ctx, k, W, H) => {
        // Hot grill marks sweeping across once
        const x = -W * 0.3 + k * W * 1.8;
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.35 * Math.sin(Math.min(1, k * 1.3) * Math.PI);
        const gr = ctx.createLinearGradient(x - 80, 0, x + 80, 0);
        gr.addColorStop(0, 'rgba(255,120,30,0)'); gr.addColorStop(0.5, 'rgba(255,150,50,.9)'); gr.addColorStop(1, 'rgba(255,120,30,0)');
        ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
      },
      emit: (W, H) => Math.random() < 0.5
        ? { x: rand(W * 0.1, W * 0.9), y: H * rand(0.55, 0.9), vx: rand(-10, 10), vy: -rand(20, 45), max: rand(1.4, 2.2),
            size: rand(22, 40), grow: 1.8, img: S.smoke, a: 0.6, sway: 0.8 }
        : { x: rand(W * 0.1, W * 0.9), y: H * rand(0.6, 0.95), vx: rand(-40, 40), vy: -rand(80, 170), g: 90,
            max: rand(0.6, 1.1), size: rand(2, 4), img: S.ember, add: true }
    },
    starters: {
      rate: 30, emitFor: 1.1,
      emit: (W) => ({
        x: rand(-20, W + 20), y: -16, vx: rand(-30, 30), vy: rand(60, 130), g: 30,
        max: rand(1.6, 2.4), size: rand(9, 15), img: Math.random() < 0.5 ? S.leaf : S.leafDark,
        rot: rand(0, TAU), vr: rand(-4, 4), sway: rand(1, 2.5)
      })
    },
    sweets: {
      rate: 70, emitFor: 1.2,
      bg: (ctx, k, W, H) => {
        // One diagonal shine passing over the photo
        const x = -W * 0.4 + k * W * 2;
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.28;
        const gr = ctx.createLinearGradient(x - 60, 0, x + 60, H * 0.4);
        gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,250,235,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
      },
      emit: (W) => Math.random() < 0.9
        ? { x: rand(0, W), y: -6, vx: rand(-8, 8), vy: rand(30, 80), g: 25, max: rand(1.5, 2.6),
            size: rand(1.5, 3.5), img: S.sugar, a: 0.95, sway: rand(0.5, 1.5) }
        : { x: rand(W * 0.1, W * 0.9), y: rand(10, 120), vx: 0, vy: 0, max: rand(0.5, 0.9),
            size: rand(6, 11), img: S.star, add: true, pulse: true }
    },
    hot: {
      rate: 14, emitFor: 1.4,
      emit: (W, H) => ({
        x: W * rand(0.25, 0.75), y: H + 20, vx: rand(-12, 12), vy: -rand(55, 95),
        max: rand(1.6, 2.4), size: rand(24, 40), grow: 2.2, img: S.steam, a: 0.75, sway: rand(1.5, 3)
      })
    },
    cold: {
      burst: 7, rate: 36, emitFor: 1.4,
      emit: (W, H, first) => first
        ? { x: rand(W * 0.1, W * 0.9), y: -30, vx: rand(-15, 15), vy: rand(40, 120), g: 420, max: rand(0.9, 1.3),
            size: rand(12, 18), img: S.ice, rot: rand(0, TAU), vr: rand(-3, 3), bounce: H * rand(0.72, 0.88) }
        : { x: rand(0, W), y: H + 10, vx: 0, vy: -rand(50, 120), g: -40, max: rand(1.2, 2),
            size: rand(3, 7), img: S.bubble, sway: rand(1, 2.5), a: 0.85 }
    },
    _default: {
      burst: 16,
      emit: (W, H) => ({ x: rand(W * 0.1, W * 0.9), y: rand(H * 0.1, H * 0.8), vx: 0, vy: 0,
        max: rand(0.5, 1), size: rand(6, 12), img: S.star, add: true, pulse: true })
    }
  };

  let current = null; // { canvas, stop }

  const play = (banner, id) => {
    if (!banner) return;
    if (current) current.stop();
    const recipe = R[id] || R._default;

    const canvas = document.createElement('canvas');
    canvas.className = 'menu__fx';
    canvas.setAttribute('aria-hidden', 'true');
    banner.appendChild(canvas);
    const W = banner.clientWidth, H = banner.clientHeight;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    const parts = [];
    const add = (first) => {
      const p = recipe.emit(W, H, first);
      p.life = 0; p.ph = rand(0, TAU);
      parts.push(p);
    };
    for (let i = 0; i < (recipe.burst || 0); i++) add(true);

    const TOTAL = 2.6;
    let t = 0, acc = 0;
    const tick = (_, dMs) => {
      const dt = Math.min(dMs / 1000, 0.05);
      t += dt;
      if (recipe.rate && t < recipe.emitFor) {
        acc += dt * recipe.rate;
        while (acc > 1) { acc -= 1; add(false); }
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, W, H);
      if (recipe.bg) { recipe.bg(ctx, Math.min(1, t / TOTAL), W, H); ctx.globalCompositeOperation = 'source-over'; }

      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life += dt;
        if (p.life >= p.max) { parts.splice(i, 1); continue; }
        p.vy += (p.g || 0) * dt;
        if (p.drag) { p.vx *= p.drag; p.vy *= p.drag; }
        p.x += p.vx * dt + (p.sway ? Math.sin(t * 3 + p.ph) * p.sway * 0.6 : 0);
        p.y += p.vy * dt;
        if (p.bounce && p.y > p.bounce && p.vy > 0) { p.y = p.bounce; p.vy *= -0.35; p.vr *= 0.5; }
        if (p.vr) p.rot += p.vr * dt;

        const k = p.life / p.max;
        let a = (p.a || 1) * (k < 0.12 ? k / 0.12 : k > 0.7 ? (1 - k) / 0.3 : 1);
        if (p.pulse) a = Math.sin(k * Math.PI);
        const s = p.size * (p.grow ? 1 + k * (p.grow - 1) : 1);
        ctx.globalCompositeOperation = p.add ? 'lighter' : 'source-over';
        ctx.globalAlpha = a;
        const img = p.img, ar = img.height / img.width;
        if (p.rot !== undefined) {
          ctx.setTransform(Math.cos(p.rot), Math.sin(p.rot), -Math.sin(p.rot), Math.cos(p.rot), p.x, p.y);
          ctx.drawImage(img, -s, -s * ar, s * 2, s * 2 * ar);
          ctx.setTransform(1, 0, 0, 1, 0, 0);
        } else {
          ctx.drawImage(img, p.x - s, p.y - s * ar, s * 2, s * 2 * ar);
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      if (t > TOTAL || (t > (recipe.emitFor || 0) + 0.2 && !parts.length && !recipe.bg)) stop();
    };

    const stop = () => {
      gsap.ticker.remove(tick);
      gsap.to(canvas, { opacity: 0, duration: 0.25, onComplete: () => canvas.remove() });
      if (current && current.canvas === canvas) current = null;
    };
    current = { canvas, stop };
    gsap.ticker.add(tick);

    // Title slides in with the scene
    const h3 = banner.querySelector('h3');
    if (h3) gsap.fromTo(h3, { x: 40, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.6, ease: 'power3.out', delay: 0.1, overwrite: true, clearProps: 'transform' });
  };

  window.catFx = { play };
})();

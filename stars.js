(function () {
  const canvas = document.getElementById("starfield");
  const ctx = canvas.getContext("2d");

  let width, height, stars, comets;
  let mouse = { x: -9999, y: -9999 };
  let _onboardingTimer = null;

  // Gold ripple — local, non-reusable, self-cleaning
  let _ripple = null;

  const STAR_COUNT = 180;
  const MOUSE_RADIUS = 100;

  const DARK_COLORS = [
    [255, 255, 255],
    [255, 255, 255],
    [255, 255, 255],
    [200, 220, 255],
    [255, 220, 180],
    [180, 200, 255],
  ];

  const LIGHT_COLORS = [
    [40, 80, 140],
    [60, 110, 180],
    [20, 30, 50],
    [50, 90, 160],
    [30, 60, 120],
    [45, 85, 150],
  ];

  // Gold tones — one per palette slot so each star has a unique warmth
  const GOLD_COLORS = [
    [255, 200, 80],
    [255, 185, 60],
    [245, 210, 100],
    [255, 195, 70],
    [250, 180, 55],
    [255, 205, 90],
  ];

  const state = {
    holdIntensity: 0,
    completionPulse: 0,
    completionSync: 0,
    resetHover: 0,
    goldIntensity: 0,
    _goldTarget: 0,
  };

  function isLight() {
    return document.body.getAttribute("data-theme") === "light";
  }

  function randomBetween(a, b) {
    return a + Math.random() * (b - a);
  }

  function makeStar() {
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      radius: randomBetween(0.3, 1.4),
      colorIndex: Math.floor(Math.random() * DARK_COLORS.length),
      baseAlpha: randomBetween(0.15, 0.55),
      alpha: 0,
      flickerSpeed: randomBetween(0.003, 0.012),
      angle: Math.random() * Math.PI * 2,
      vx: randomBetween(-0.015, 0.015),
      vy: randomBetween(-0.015, 0.015),
    };
  }

  function makeComet() {
    const angle = randomBetween(-0.3, 0.3);
    const speed = randomBetween(6, 10);
    const startEdge = Math.random() < 0.5 ? "top" : "left";
    let x, y;
    if (startEdge === "top") {
      x = randomBetween(width * 0.1, width * 0.9);
      y = -10;
    } else {
      x = -10;
      y = randomBetween(height * 0.1, height * 0.6);
    }
    return {
      x,
      y,
      vx: Math.cos(angle + Math.PI / 4) * speed,
      vy: Math.sin(angle + Math.PI / 4) * speed,
      length: randomBetween(60, 110),
      alpha: randomBetween(0.5, 0.8),
      width: randomBetween(0.8, 1.4),
      alive: true,
    };
  }

  function init() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    stars = Array.from({ length: STAR_COUNT }, makeStar);
    stars.forEach((s) => (s.alpha = s.baseAlpha));
    comets = [];
  }

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    // Clamp existing star positions into new bounds — no recreation
    if (stars) {
      for (const s of stars) {
        if (s.x > width)  s.x = Math.random() * width;
        if (s.y > height) s.y = Math.random() * height;
      }
    }
  }

  let _lastFrameTime = 0;

  function draw() {
    const _now = performance.now();
    if (_lastFrameTime > 0 && _now - _lastFrameTime > 25) {
      console.warn(`[Starfield] Frame spike: ${(_now - _lastFrameTime).toFixed(1)}ms`);
    }
    _lastFrameTime = _now;

    ctx.clearRect(0, 0, width, height);

    const light = isLight();
    const palette = light ? LIGHT_COLORS : DARK_COLORS;
    // In light mode stars need higher alpha to show against the pale background
    const alphaScale = light ? 1.6 : 1.0;

    if (state.holdIntensity > 0) {
      state.holdIntensity = Math.max(0, state.holdIntensity - 0.008);
    }
    if (state.completionPulse > 0) {
      state.completionPulse = Math.max(0, state.completionPulse - 0.018);
    }
    if (state.completionSync > 0) {
      state.completionSync = Math.max(0, state.completionSync - 0.008);
    }
    if (state.resetHover > 0 && state._resetHoverTarget === 0) {
      state.resetHover = Math.max(0, state.resetHover - 0.025);
    }
    if (state.resetHover < 1 && state._resetHoverTarget === 1) {
      state.resetHover = Math.min(1, state.resetHover + 0.025);
    }
    // Gold ripple — expand radius, decay strength, self-clean
    if (_ripple) {
      _ripple.radius += _ripple.speed;
      _ripple.strength = Math.max(0, _ripple.strength - _ripple.decay);
      if (_ripple.strength === 0) _ripple = null;
    }

    // Gold: ~0.7s ease-in, ~0.7s ease-out (step ≈ 0.008 per frame at 60fps)
    if (state.goldIntensity < state._goldTarget) {
      state.goldIntensity = Math.min(
        state._goldTarget,
        state.goldIntensity + 0.008
      );
    } else if (state.goldIntensity > state._goldTarget) {
      state.goldIntensity = Math.max(
        state._goldTarget,
        state.goldIntensity - 0.008
      );
    }

    for (const s of stars) {
      s.x += s.vx;
      s.y += s.vy;

      if (s.x < -2) s.x = width + 2;
      if (s.x > width + 2) s.x = -2;
      if (s.y < -2) s.y = height + 2;
      if (s.y > height + 2) s.y = -2;

      const t = state.completionSync;
      s.angle += t * 0.04 + (1 - t) * s.flickerSpeed;

      const goldBoost = state.goldIntensity * (0.5 + (s.radius / 1.4) * 0.5);

      let rippleBoost = 0;
      if (_ripple) {
        const rdx = s.x - _ripple.cx;
        const rdy = s.y - _ripple.cy;
        const rdist = Math.sqrt(rdx * rdx + rdy * rdy);
        const bandDist = Math.abs(rdist - _ripple.radius);
        const bandWidth = 220;
        if (bandDist < bandWidth) {
          const falloff = 1 - bandDist / bandWidth;
          rippleBoost = falloff * falloff * _ripple.strength;
        }
      }

      const flickerRange = 0.18 + state.holdIntensity * 0.14 + goldBoost * 0.08;
      const flicker = Math.sin(s.angle) * flickerRange;

      const dx = s.x - mouse.x;
      const dy = s.y - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const proximity =
        dist < MOUSE_RADIUS ? (1 - dist / MOUSE_RADIUS) * 0.45 : 0;

      const boost = state.holdIntensity * 0.3 + state.completionPulse * 0.7;

      const goldAlphaBoost = goldBoost * 0.15;
      const targetAlpha = Math.min(
        1,
        Math.max(
          0,
          (s.baseAlpha + flicker + proximity + boost + goldAlphaBoost + rippleBoost * 0.65) *
            alphaScale
        )
      );
      s.alpha += (targetAlpha - s.alpha) * 0.12;

      const [sr, sg, sb] = palette[s.colorIndex];
      const [gr, gg, gb] = GOLD_COLORS[s.colorIndex];
      const g = Math.min(1, goldBoost + rippleBoost * 0.9);
      const r = state.resetHover;

      let fr = sr,
        fg = sg,
        fb = sb;
      if (g > 0) {
        fr = Math.round(sr + (gr - sr) * g);
        fg = Math.round(sg + (gg - sg) * g);
        fb = Math.round(sb + (gb - sb) * g);
      }

      let starColor;
      if (r > 0) {
        const rr = Math.round(fr + (255 - fr) * r);
        const rg = Math.round(fg * (1 - r * 0.85));
        const rb = Math.round(fb * (1 - r * 0.9));
        starColor = `rgba(${rr},${rg},${rb},${s.alpha})`;
      } else {
        starColor = `rgba(${fr},${fg},${fb},${s.alpha})`;
      }

      ctx.beginPath();
      ctx.arc(
        s.x,
        s.y,
        s.radius + proximity * 0.6 + state.completionPulse * 0.4 + rippleBoost * 1.2,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = starColor;
      ctx.fill();
    }

    comets = comets.filter((c) => c.alive);
    for (const c of comets) {
      const tailX = c.x - c.vx * (c.length / Math.hypot(c.vx, c.vy));
      const tailY = c.y - c.vy * (c.length / Math.hypot(c.vx, c.vy));

      const grad = ctx.createLinearGradient(tailX, tailY, c.x, c.y);
      if (light) {
        grad.addColorStop(0, `rgba(30,60,130,0)`);
        grad.addColorStop(1, `rgba(30,60,130,${c.alpha})`);
      } else {
        grad.addColorStop(0, `rgba(255,255,255,0)`);
        grad.addColorStop(1, `rgba(255,255,255,${c.alpha})`);
      }

      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(c.x, c.y);
      ctx.strokeStyle = grad;
      ctx.lineWidth = c.width;
      ctx.stroke();

      c.x += c.vx;
      c.y += c.vy;
      c.alpha -= 0.012;

      if (c.x > width + 120 || c.y > height + 120 || c.alpha <= 0) {
        c.alive = false;
      }
    }

    requestAnimationFrame(draw);
  }

  window.addEventListener("resize", resize);
  window.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });
  window.addEventListener("mouseleave", () => {
    mouse.x = -9999;
    mouse.y = -9999;
  });

  init();
  draw();

  window.Starfield = {
    triggerHoldStart() {
      state.holdIntensity = 1;
    },
    triggerHoldEnd() {
      state.holdIntensity = 0;
    },
    triggerCompletion() {
      state.completionPulse = 1;
      state.completionSync = 1;
      for (let i = 0; i < 4; i++) {
        setTimeout(() => comets.push(makeComet()), i * 120);
      }
    },
    triggerResetHoverStart() {
      state._resetHoverTarget = 1;
    },
    triggerResetHoverEnd() {
      state._resetHoverTarget = 0;
    },
    triggerGoldHabitStart() {
      state._goldTarget = 1;
    },
    triggerGoldHabitEnd() {
      state._goldTarget = 0;
    },
    triggerGoldRipple() {
      _ripple = {
        cx: width / 2,
        cy: height / 2,
        radius: 0,
        speed: 7,        // px per frame — crosses ~1080px in ~155 frames (~2.5s)
        strength: 1,
        decay: 0.008,    // fades to zero in ~125 frames
      };
    },
    startOnboardingComets() {
      if (_onboardingTimer !== null) return;
      const schedule = () => {
        const delay = 3000 + Math.random() * 3000;
        _onboardingTimer = setTimeout(() => {
          comets.push(makeComet());
          schedule();
        }, delay);
      };
      schedule();
    },
    stopOnboardingComets() {
      clearTimeout(_onboardingTimer);
      _onboardingTimer = null;
    },
  };
})();

/* =========================================================
   particles.js — subtle animated backdrop
   Floating dust motes + slow-drifting candlelight pools.
   Pure canvas 2D, no external assets.
   ========================================================= */
const Particles = (() => {
  let canvas, ctx, dpr;
  let motes = [];
  let glows = [];
  let running = true;
  let reduced = false;

  function init() {
    canvas = document.getElementById("bg-canvas");
    if (!canvas) return;
    ctx = canvas.getContext("2d");
    reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    resize();
    window.addEventListener("resize", resize);

    const moteCount = Math.min(70, Math.floor((window.innerWidth * window.innerHeight) / 18000));
    motes = Array.from({ length: moteCount }, spawnMote);

    glows = [
      { x: 0.18, y: 0.25, r: 260, hue: "230,200,119", speed: 0.00013, phase: 0 },
      { x: 0.82, y: 0.7, r: 320, hue: "200,90,60", speed: 0.00009, phase: 2 },
      { x: 0.55, y: 0.15, r: 220, hue: "230,200,119", speed: 0.00011, phase: 4 }
    ];

    if (!reduced) requestAnimationFrame(loop);
    else draw(0); // static single frame
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function spawnMote() {
    return {
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: 0.6 + Math.random() * 1.8,
      vx: (Math.random() - 0.5) * 0.06,
      vy: -0.04 - Math.random() * 0.09,
      alpha: 0.15 + Math.random() * 0.35,
      drift: Math.random() * Math.PI * 2
    };
  }

  function loop(t) {
    if (!running) return;
    draw(t);
    requestAnimationFrame(loop);
  }

  function draw(t) {
    const w = window.innerWidth, h = window.innerHeight;
    ctx.clearRect(0, 0, w, h);

    // candlelight glow pools
    glows.forEach(g => {
      const gx = g.x * w + Math.sin(t * g.speed + g.phase) * 40;
      const gy = g.y * h + Math.cos(t * g.speed * 0.8 + g.phase) * 30;
      const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, g.r);
      grad.addColorStop(0, `rgba(${g.hue}, 0.10)`);
      grad.addColorStop(1, `rgba(${g.hue}, 0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    });

    // dust motes
    ctx.save();
    motes.forEach(m => {
      m.drift += 0.004;
      m.x += m.vx + Math.sin(m.drift) * 0.03;
      m.y += m.vy;
      if (m.y < -10) { m.y = h + 10; m.x = Math.random() * w; }
      if (m.x < -10) m.x = w + 10;
      if (m.x > w + 10) m.x = -10;

      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(230, 210, 160, ${m.alpha})`;
      ctx.fill();
    });
    ctx.restore();
  }

  function setRunning(v) { running = v; if (running && !reduced) requestAnimationFrame(loop); }

  return { init, setRunning };
})();

document.addEventListener("DOMContentLoaded", Particles.init);

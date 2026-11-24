// Small confetti burst at a point on screen — the reward pop for
// recording a win. Self-contained canvas, removed when done.
// No-op under prefers-reduced-motion; never throws.

const COLORS = ['#f5b942', '#ff7847', '#7bd88f', '#ffffff', '#6fc3ff', '#ff6b81'];

export function burstAt(x: number, y: number) {
  try {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const canvas = document.createElement('canvas');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.style.cssText =
      'position:fixed;inset:0;width:100vw;height:100dvh;pointer-events:none;z-index:120';
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    document.body.append(canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      canvas.remove();
      return;
    }
    ctx.scale(dpr, dpr);
    const parts = Array.from({ length: 42 }, (_, i) => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.2 + Math.random() * 3.8;
      return {
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.4,
        size: 3.5 + Math.random() * 4.5,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        color: COLORS[i % COLORS.length],
      };
    });
    const t0 = performance.now();
    const frame = (now: number) => {
      const elapsed = now - t0;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (const p of parts) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.14;
        p.vx *= 0.985;
        p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.max(0, 1 - elapsed / 750);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.72);
        ctx.restore();
      }
      if (elapsed < 780) requestAnimationFrame(frame);
      else canvas.remove();
    };
    requestAnimationFrame(frame);
  } catch {
    /* decoration only */
  }
}

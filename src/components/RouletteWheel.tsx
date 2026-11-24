import { useEffect, useRef } from 'react';

// The roulette wheel from the effects preview (effects/scenes/spin.ts),
// brought into the real draw: same six blue wedges and top pointer,
// spinning fast at first and easing out to a stop as the draw resolves.
// Purely visual — the fair lottery has already decided the results.

const COLORS = ['#244761', '#648298', '#a8bfd0', '#43637e', '#d6e1eb', '#7594a8'];
const GOLD = '#f5b942';
const NAVY = '#172f45';

function drawWheel(ctx: CanvasRenderingContext2D, rotation: number, stopped: boolean) {
  ctx.clearRect(0, 0, 480, 480);
  ctx.save();
  ctx.translate(240, 240);
  if (stopped) {
    ctx.save();
    ctx.shadowColor = GOLD;
    ctx.shadowBlur = 34;
    ctx.beginPath();
    ctx.arc(0, 0, 164, 0, Math.PI * 2);
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }
  ctx.rotate(rotation);
  const step = (Math.PI * 2) / COLORS.length;
  const pad = 0.035;
  COLORS.forEach((color, i) => {
    const a0 = i * step + pad / 2;
    const a1 = (i + 1) * step - pad / 2;
    ctx.beginPath();
    ctx.arc(0, 0, 162, a0, a1);
    ctx.arc(0, 0, 31, a1, a0, true);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  });
  ctx.restore();

  // Hub with the brand mark.
  ctx.save();
  ctx.translate(240, 240);
  ctx.beginPath();
  ctx.arc(0, 0, 30, 0, Math.PI * 2);
  ctx.fillStyle = NAVY;
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = GOLD;
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = '700 27px "Noto Sans JP", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('脳', 0, 2);
  ctx.restore();

  // Fixed pointer at the top.
  ctx.save();
  ctx.shadowColor = '#00000055';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.moveTo(226, 52);
  ctx.lineTo(254, 52);
  ctx.lineTo(240, 84);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function RouletteWheel({ spinMs, halted }: { spinMs: number; halted: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rotationRef = useRef(0);
  const haltedRef = useRef(false);
  haltedRef.current = halted;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const total = 4 * Math.PI + 0.4 + Math.random() * Math.PI;
    const t0 = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      const t = Math.min(1, (now - t0) / spinMs);
      if (!haltedRef.current) {
        rotationRef.current = total * (1 - Math.pow(1 - t, 3));
      }
      drawWheel(ctx, rotationRef.current, t >= 1 || haltedRef.current);
      if (t < 1 && !haltedRef.current) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinMs]);

  return <canvas ref={canvasRef} className="roulette-wheel" width={480} height={480} aria-hidden="true" />;
}

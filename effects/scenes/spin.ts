import { animate } from 'animejs';
import { arc, scaleBand } from 'd3';
import type { SceneOptions } from './types';

export function play(surface: HTMLElement, { immediate }: SceneOptions) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 480;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is unavailable');
  surface.append(canvas);
  const colors = ['#244761', '#648298', '#a8bfd0', '#43637e', '#d6e1eb', '#7594a8'];
  const slices = scaleBand<number>().domain(colors.map((_, index) => index)).range([0, 2 * Math.PI]);
  const wedge = arc<{ startAngle: number; endAngle: number }>()
    .context(ctx).innerRadius(31).outerRadius(162).padAngle(0.035).cornerRadius(5);
  const state = { rotation: immediate ? 0.4 : 0 };
  const draw = () => {
    ctx.clearRect(0, 0, 480, 480);
    ctx.save();
    ctx.translate(240, 240);
    ctx.rotate(state.rotation);
    colors.forEach((color, index) => {
      const startAngle = slices(index)!;
      ctx.beginPath();
      wedge({ startAngle, endAngle: startAngle + slices.bandwidth() });
      ctx.fillStyle = color;
      ctx.fill();
    });
    ctx.restore();
    ctx.fillStyle = '#172f45';
    ctx.beginPath();
    ctx.moveTo(226, 56);
    ctx.lineTo(254, 56);
    ctx.lineTo(240, 87);
    ctx.fill();
  };
  draw();
  if (immediate) return;
  const animation = animate(state, {
    rotation: 4 * Math.PI + 0.4,
    duration: 1700,
    ease: 'outCubic',
    onUpdate: draw,
  });
  return () => animation.cancel();
}

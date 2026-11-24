import lottie from 'lottie-web/build/player/lottie_light';
import type { SceneOptions } from './types';

export function play(surface: HTMLElement, { immediate }: SceneOptions) {
  const animationData = {
    v: '5.12.2', fr: 30, ip: 0, op: 48, w: 560, h: 420, nm: 'Round stamp', assets: [],
    layers: [{
      ty: 4, ind: 1, nm: 'Round stamp', ip: 0, op: 48, st: 0, sr: 1, ao: 0,
      ks: {
        o: { a: 0, k: 100 }, p: { a: 0, k: [280, 210, 0] }, a: { a: 0, k: [0, 0, 0] },
        r: { a: 0, k: -9 },
        s: { a: 1, k: [
          { t: 0, s: [0, 0, 100], i: { x: 0.6, y: 1 }, o: { x: 0.2, y: 0 } },
          { t: 12, s: [113, 113, 100], i: { x: 0.6, y: 1 }, o: { x: 0.2, y: 0 } },
          { t: 23, s: [100, 100, 100] },
        ] },
      },
      shapes: [
        { ty: 'rc', d: 1, p: { a: 0, k: [0, 0] }, s: { a: 0, k: [167, 167] }, r: { a: 0, k: 21 } },
        { ty: 'st', c: { a: 0, k: [0.15, 0.33, 0.48, 1] }, o: { a: 0, k: 100 }, w: { a: 0, k: 12 }, lc: 2, lj: 2 },
      ],
    }],
  };
  const animation = lottie.loadAnimation({ container: surface, renderer: 'svg', loop: false, autoplay: !immediate, animationData });
  if (immediate) animation.goToAndStop(25, true);
  return () => animation.destroy();
}

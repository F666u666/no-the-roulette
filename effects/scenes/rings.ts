import p5 from 'p5';
import type { SceneOptions } from './types';

export function play(surface: HTMLElement, { immediate }: SceneOptions) {
  const sketch = new p5((p) => {
    p.setup = () => {
      p.createCanvas(560, 420);
      p.pixelDensity(1);
      if (immediate) p.noLoop();
    };
    p.draw = () => {
      p.clear();
      p.noFill();
      p.strokeWeight(2);
      const moment = immediate ? 0.65 : Math.min(p.millis() / 1550, 1);
      for (let ring = 0; ring < 5; ring++) {
        p.stroke(41 + ring * 12, 79 + ring * 10, 105 + ring * 12, 205 - ring * 22);
        p.beginShape();
        for (let point = 0; point < 90; point++) {
          const angle = point / 90 * p.TWO_PI;
          const texture = p.noise(Math.cos(angle) + 3, Math.sin(angle) + 3, ring / 4 + moment);
          const radius = 23 + ring * 24 + moment * 21 + texture * 22;
          p.vertex(280 + Math.cos(angle) * radius, 210 + Math.sin(angle) * radius);
        }
        p.endShape(p.CLOSE);
      }
      if (moment >= 1) p.noLoop();
    };
  }, surface);
  return () => sketch.remove();
}

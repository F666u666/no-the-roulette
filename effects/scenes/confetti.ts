import { Application, Graphics, Ticker } from 'pixi.js';
import { Bodies, Body, Composite, Engine } from 'matter-js';
import type { SceneOptions } from './types';

export async function play(surface: HTMLElement, { signal, immediate }: SceneOptions) {
  const app = new Application();
  await app.init({ width: 560, height: 420, backgroundAlpha: 0, antialias: true, preference: 'webgl' });
  const dispose = () => app.destroy({ removeView: true }, { children: true });
  if (signal.aborted) {
    dispose();
    return;
  }

  const engine = Engine.create();
  const colors = [0x284e69, 0x7599b4, 0xa6bed0, 0xd19c82, 0xeff7ff];
  const pieces = Array.from({ length: 36 }, (_, index) => {
    const angle = index * 2.4;
    const radius = 36 + (index % 8) * 12;
    const body = Bodies.rectangle(
      immediate ? 280 + Math.cos(angle) * radius : 280,
      immediate ? 210 + Math.sin(angle) * radius : 232,
      11, 18, { collisionFilter: { mask: 0 }, frictionAir: 0.02 },
    );
    Body.setVelocity(body, { x: Math.cos(angle) * (5 + index % 9), y: -7 - (index % 13) * 0.7 });
    Body.setAngularVelocity(body, (index % 2 ? -1 : 1) * 0.12);
    const graphic = new Graphics().roundRect(-6, -9, 12, 18, 2).fill(colors[index % colors.length]);
    app.stage.addChild(graphic);
    Composite.add(engine.world, body);
    return { body, graphic };
  });
  surface.append(app.canvas);
  function draw() {
    for (const { body, graphic } of pieces) {
      graphic.position.set(body.position.x, body.position.y);
      graphic.rotation = body.angle;
    }
  }
  draw();
  if (immediate) app.stop();
  else {
    let elapsed = 0;
    app.ticker.add((ticker: Ticker) => {
      Engine.update(engine, Math.min(ticker.deltaMS, 1000 / 60));
      draw();
      elapsed += ticker.deltaMS;
      if (elapsed > 2200) app.stop();
    });
  }
  return dispose;
}

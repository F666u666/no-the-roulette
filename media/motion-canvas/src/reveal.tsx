import { Circle, makeScene2D, Rect, Txt } from '@motion-canvas/2d';
import { all, createRef, easeOutCubic, waitFor } from '@motion-canvas/core';

export default makeScene2D(function* reveal(view) {
  const ring = createRef<Circle>();
  const title = createRef<Txt>();
  view.add(
    <Rect width="100%" height="100%" fill="#e3ecf4">
      <Circle ref={ring} size={360} lineWidth={5} stroke="#557f9d" scale={0.4} opacity={0} />
      <Txt ref={title} text="脳THEルーレット" fontFamily="sans-serif" fill="#173752" fontSize={84} y={45} opacity={0} />
    </Rect>,
  );
  yield* all(
    ring().scale(1.5, 0.8, easeOutCubic),
    ring().opacity(0.7, 0.23).to(0.22, 0.57),
    title().position.y(0, 0.55, easeOutCubic),
    title().opacity(1, 0.55),
  );
  yield* waitFor(1.2);
});

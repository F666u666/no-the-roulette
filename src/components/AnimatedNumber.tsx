import { useEffect, useState } from 'react';
import { useReducedMotion } from 'motion/react';

const integer = (value: number) => String(Math.round(value));

export function AnimatedNumber({
  value,
  format = integer,
}: {
  value: number;
  format?: (value: number) => string;
}) {
  const reducedMotion = useReducedMotion();
  const [visual, setVisual] = useState(0);

  useEffect(() => {
    if (reducedMotion || !value) return;
    let id: number;
    const started = performance.now();
    const tick = (time: number) => {
      const progress = Math.min((time - started) / 740, 1);
      setVisual(progress === 1 ? value : value * (1 - 2 ** (-10 * progress)));
      if (progress < 1) id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [value, reducedMotion]);

  return (
    <span className="count-up">
      <span className="sr-only">{format(value)}</span>
      <span aria-hidden="true">{format(reducedMotion || !value ? value : visual)}</span>
    </span>
  );
}

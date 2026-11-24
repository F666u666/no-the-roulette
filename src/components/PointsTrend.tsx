import { useEffect, useRef } from 'react';
import { formatPoints } from '../services/drawHistory';

const width = 520;
const height = 110;
const pad = 8;

export function PointsTrend({ points }: { points: number[] }) {
  const line = useRef<HTMLCanvasElement>(null);
  const low = Math.min(0, ...points);
  const high = Math.max(0, ...points);
  const y = height - pad - (0 - low) / (high - low || 1) * (height - 2 * pad);

  useEffect(() => {
    const context = line.current?.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, width, height);
    context.lineJoin = 'round';
    context.lineCap = 'round';
    context.lineWidth = 3;
    context.strokeStyle = '#315a78';
    context.beginPath();
    points.forEach((point, index) => {
      const x = pad + index * (width - 2 * pad) / (points.length - 1);
      const heightAtPoint = y - point * (height - 2 * pad) / (high - low || 1);
      if (index === 0) context.moveTo(x, heightAtPoint);
      else context.lineTo(x, heightAtPoint);
    });
    context.stroke();
  }, [points, y, high, low]);

  return (
    <figure className="points-trend">
      <figcaption>この対戦日のポイント推移</figcaption>
      <div className="points-trend-plot">
        <span className="points-trend-zero" style={{ top: `${y / height * 100}%` }} aria-hidden="true" />
        <canvas ref={line} width={width} height={height} role="img"
          aria-label={`0ポイントから${formatPoints(points.at(-1) ?? 0)}までの推移`} />
      </div>
    </figure>
  );
}

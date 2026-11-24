import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export function Reveal({ title }: { title: string }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const reveal = spring({ frame, fps, config: { damping: 17, stiffness: 135 } });
  const sweep = interpolate(frame, [0, 35], [-220, 1380], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{
      backgroundColor: '#e3ecf4', color: '#173752', fontFamily: 'system-ui, sans-serif',
      alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', width: 240, height: '160%', top: '-25%', left: sweep,
        background: 'rgba(255, 255, 255, 0.65)', transform: 'skewX(-25deg)',
      }} />
      <div style={{
        width: 310, height: 310, position: 'absolute',
        border: '2px solid #779cb9', transform: `rotate(45deg) scale(${0.54 + 0.46 * reveal})`,
      }} />
      <div style={{ position: 'relative', fontSize: 72, fontWeight: 650, opacity: Math.min(1, reveal), transform: `translateY(${(1 - reveal) * 32}px)` }}>
        {title}
      </div>
    </AbsoluteFill>
  );
}

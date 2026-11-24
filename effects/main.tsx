import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { animated, useSpring } from '@react-spring/web';
import './styles.css';

const scenes = [
  { label: 'スピン', load: () => import('./scenes/spin') },
  { label: '紙吹雪', load: () => import('./scenes/confetti') },
  { label: '光の波紋', load: () => import('./scenes/rings') },
  { label: '3Dメダル', load: () => import('./scenes/medal') },
  { label: 'スタンプ', load: () => import('./scenes/stamp') },
  { label: '結果タイトル', load: () => import('./scenes/title') },
];

export function Preview() {
  const [index, setIndex] = useState(0);
  const [run, setRun] = useState(0);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [sound, setSound] = useState<typeof import('./sound')>();
  const [soundError, setSoundError] = useState('');
  const stage = useRef<HTMLDivElement>(null);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    let current = true;
    import('./sound')
      .then((module) => { if (current) setSound(module); })
      .catch(() => { if (current) setSoundError('効果音を読み込めませんでした'); });
    return () => { current = false; };
  }, []);

  useEffect(() => {
    if (!stage.current) return;
    const surface = document.createElement('div');
    surface.className = 'surface';
    stage.current.replaceChildren(surface);
    const controller = new AbortController();
    let dispose: (() => void) | undefined;
    const immediate = reduceMotion && run === 0;

    scenes[index].load()
      .then((module) => {
        if (controller.signal.aborted) return;
        return module.play(surface, { signal: controller.signal, immediate });
      })
      .then((cleanup) => {
        if (typeof cleanup === 'function') dispose = cleanup;
        if (controller.signal.aborted) dispose?.();
        else setReady(true);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setError('この端末で演出を再生できませんでした。別の演出を選べます。');
        }
      });

    return () => {
      controller.abort();
      dispose?.();
      surface.remove();
    };
  }, [index, run, reduceMotion]);

  const entrance = useSpring({
    key: `${index}-${run}`,
    reset: true,
    from: { opacity: 0.72, scale: 0.975 },
    to: { opacity: 1, scale: 1 },
    immediate: reduceMotion,
    config: { tension: 220, friction: 26 },
  });

  function select(next: number) {
    setReady(false);
    setError('');
    setIndex(next);
    setRun((value) => value + 1);
  }

  return (
    <main className="preview">
      <header><a href="/">← ルーレットに戻る</a></header>
      <h1>演出プレビュー</h1>
      <animated.div className="stage" style={{ opacity: entrance.opacity, scale: entrance.scale }}>
        <div className="stage-content" ref={stage} aria-hidden="true" />
        <p className="status" role="status">{error || (!ready && '読み込み中…')}</p>
      </animated.div>
      <div className="choices" role="group" aria-label="演出を選択">
        {scenes.map(({ label }, position) => (
          <button key={label} aria-pressed={index === position} onClick={() => select(position)}>
            {label}
          </button>
        ))}
      </div>
      <div className="actions">
        <button className="replay" onClick={() => select(index)}>もう一度</button>
        <button disabled={!sound} onClick={() => {
          setSoundError('');
          sound?.playChime().catch(() => setSoundError('効果音を再生できませんでした'));
        }}>効果音を試聴</button>
      </div>
      {soundError && <p className="audio-error" role="status">{soundError}</p>}
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<Preview />);

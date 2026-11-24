import { useEffect, useMemo, useRef, useState } from 'react';
import { FighterArt } from './Art';
import { fighterById } from '../data/fighters';
import { ceremonyFanfare, ceremonyLock, ceremonyTick, primeCeremony } from '../services/ceremonySound';
import { RouletteWheel } from './RouletteWheel';

export interface DrawStageEntry {
  playerId: string;
  playerName: string;
  candidates: string[];
  winner: string;
}

const SHUFFLE_MS = 1350;
const FINALE_HOLD_MS = 1180;

function staggerFor(count: number): number {
  return Math.max(200, Math.min(500, Math.floor(2300 / Math.max(1, count))));
}

/** Visual-only shuffle for the cycling portraits. The draw result is
 *  already decided by the fair lottery; this never touches it. */
function shuffled(ids: string[]): string[] {
  const copy = [...ids];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const CONFETTI_COLORS = ['#f5b942', '#ff7847', '#7bd88f', '#ffffff', '#6fc3ff', '#ff6b81'];

export function DrawStage({
  entries,
  soundOn,
  onDone,
}: {
  entries: DrawStageEntry[];
  soundOn: boolean;
  onDone: () => void;
}) {
  const count = entries.length;
  const stagger = staggerFor(count);
  const [lockedCount, setLockedCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [tick, setTick] = useState(0);
  const timers = useRef<number[]>([]);
  const doneRef = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const decks = useMemo(() => entries.map((e) => shuffled(e.candidates)), [entries]);

  const burstRef = useRef<() => void>(() => {});
  burstRef.current = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    const g = canvas.getContext('2d');
    if (!g) return;
    const parts = Array.from({ length: 130 }, (_, i) => ({
      x: width / 2 + (Math.random() - 0.5) * width * 0.55,
      y: -30 - Math.random() * height * 0.3,
      w: 6 + Math.random() * 6,
      h: 8 + Math.random() * 9,
      vx: (Math.random() - 0.5) * 1.7,
      vy: 2.4 + Math.random() * 2.8,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.28,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    }));
    const t0 = performance.now();
    const frame = (now: number) => {
      const elapsed = now - t0;
      g.clearRect(0, 0, width, height);
      for (const p of parts) {
        p.x += p.vx + Math.sin(elapsed / 280 + p.rot) * 0.7;
        p.y += p.vy;
        p.rot += p.vr;
        g.save();
        g.translate(p.x, p.y);
        g.rotate(p.rot);
        g.globalAlpha = elapsed < 1250 ? 1 : Math.max(0, 1 - (elapsed - 1250) / 500);
        g.fillStyle = p.color;
        g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        g.restore();
      }
      if (elapsed < 1800) requestAnimationFrame(frame);
      else g.clearRect(0, 0, width, height);
    };
    requestAnimationFrame(frame);
  };

  const finishRef = useRef<() => void>(() => {});
  finishRef.current = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  };

  useEffect(() => {
    primeCeremony(soundOn);
    entries.forEach((_, i) => {
      timers.current.push(
        window.setTimeout(
          () => {
            setLockedCount((c) => Math.max(c, i + 1));
            ceremonyLock(soundOn, i);
          },
          SHUFFLE_MS + stagger * i,
        ),
      );
    });
    timers.current.push(
      window.setTimeout(
        () => {
          setFinished(true);
          ceremonyFanfare(soundOn);
          burstRef.current();
        },
        SHUFFLE_MS + stagger * count + 140,
      ),
    );
    timers.current.push(
      window.setTimeout(() => finishRef.current(), SHUFFLE_MS + stagger * count + 140 + FINALE_HOLD_MS),
    );
    const list = timers.current;
    return () => list.forEach((t) => window.clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (finished) return;
    const iv = window.setInterval(() => {
      setTick((t) => t + 1);
      ceremonyTick(soundOn);
    }, 80);
    return () => window.clearInterval(iv);
  }, [finished, soundOn]);

  const skip = () => {
    if (doneRef.current || finished) return;
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setLockedCount(count);
    setFinished(true);
    ceremonyFanfare(soundOn);
    burstRef.current();
    timers.current.push(window.setTimeout(() => finishRef.current(), 520));
  };

  return (
    <div
      className="draw-stage"
      role="status"
      aria-label={finished ? '抽選結果が決定しました' : 'ファイターを抽選中'}
      onClick={skip}
    >
      <canvas ref={canvasRef} className="draw-stage-confetti" aria-hidden="true" />
      <header className="draw-stage-head">
        <span className="draw-stage-kicker">脳THEルーレット</span>
        <strong className={finished ? 'draw-stage-title done' : 'draw-stage-title'}>
          {finished ? '決定！' : '抽選中'}
        </strong>
        <span className="draw-stage-hint">{finished ? '' : 'タップでスキップ'}</span>
      </header>
      <div className={finished ? 'draw-stage-wheel stopped' : 'draw-stage-wheel'} data-count={count}>
        <RouletteWheel spinMs={SHUFFLE_MS + stagger * Math.max(0, count - 1) + 140} halted={finished} />
      </div>
      <div className="draw-stage-grid" data-count={count} data-density={count > 4 ? 'compact' : 'regular'}>
        {entries.map((entry, i) => {
          const locked = i < lockedCount;
          const deck = decks[i];
          const shownId = locked
            ? entry.winner
            : (deck[(tick + i * 3) % deck.length] ?? entry.winner);
          const fighter = fighterById[shownId];
          return (
            <div key={entry.playerId} className={locked ? 'draw-slot locked' : 'draw-slot'}>
              <div className="draw-slot-seat">
                <span>{i + 1}P</span>
                <strong>{entry.playerName}</strong>
                {locked && <em>決定</em>}
              </div>
              <div className="draw-slot-view">
                {fighter && (
                  <div className={locked ? 'draw-slot-stop' : 'draw-slot-swap'} key={shownId}>
                    <FighterArt fighter={fighter} portrait />
                  </div>
                )}
              </div>
              <div className="draw-slot-name">{fighter?.name ?? ''}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

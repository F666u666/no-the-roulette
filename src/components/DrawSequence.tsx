import { useEffect, useState } from 'react';
import { FighterArt } from './Art';
import { fighterById } from '../data/fighters';

export const DRAW_REVEAL_MS = 1520;
const beats = [60, 120, 180, 245, 320, 405, 500, 610, 740, 900, 1080, 1260];

export function DrawSequence({ candidates, winner }: { candidates: string[]; winner: string }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timers = beats.map((beat, index) => window.setTimeout(() => setStep(index + 1), beat));
    return () => timers.forEach(window.clearTimeout);
  }, []);

  const stopped = step === beats.length;
  const fighter = fighterById[stopped ? winner : candidates[step % candidates.length] ?? winner];

  return (
    <div className="draw-sequence" role="status" aria-label="ファイターを抽選中">
      <div className="draw-sequence-inner" aria-hidden="true">
        <span className="draw-sequence-label">{stopped ? '決定' : '抽選中'}</span>
        <div className="draw-sequence-view">
          <div className={stopped ? 'draw-sequence-stop' : 'draw-sequence-swap'} key={step}>
            <FighterArt fighter={fighter} portrait />
          </div>
        </div>
        <div className="draw-sequence-track"><span /></div>
      </div>
    </div>
  );
}

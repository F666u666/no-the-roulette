import { AnimatedNumber } from '../components/AnimatedNumber';
import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowsClockwise, ArrowRight } from '@phosphor-icons/react';
import type { Player, Results as ResultMap, DrawRecord, MatchOutcome } from '../models/types';
import { fighterById } from '../data/fighters';
import { FighterArt } from '../components/Art';
import { Back } from '../components/Primitives';
import { OutcomeButtons } from '../components/MatchRecord';
import { gameDay, recordsForDay, tally, formatPoints, playerPoints } from '../services/drawHistory';

export function Results({
  players,
  results,
  round,
  busy,
  rerolling,
  reroll,
  again,
  back,
  excludePrevious,
  records,
  recordIds,
  day,
  changeOutcome,
  record,
  openHistory,
}: {
  players: Player[];
  results: ResultMap;
  round: number;
  busy: boolean;
  rerolling: string | null;
  reroll: (id: string) => void;
  again: () => void;
  back: () => void;
  excludePrevious: boolean;
  records: DrawRecord[];
  recordIds: Record<string, string>;
  day: string;
  changeOutcome: (id: string, outcome: MatchOutcome) => void;
  record: (id: string) => void;
  openHistory: (id: string) => void;
}) {
  const reducedMotion = useReducedMotion();
  const [revealed, setRevealed] = useState<string | null>(null);
  return (
    <>
      <header className="topbar">
        <Back onClick={back} />
        <h1 className="nav-title">抽選結果</h1>
        <span className="round" aria-label={`Round ${round}`}>
          <span>ROUND</span>
          <b><AnimatedNumber value={round} format={(value) => String(Math.round(value)).padStart(2, '0')} /></b>
        </span>
        {players.length === 1 && (
          <button className="results-history" onClick={() => openHistory(players[0].id)}>
            履歴
          </button>
        )}
      </header>
      <main className="results-main" id="main-content">
        <div className="draw-rules">
          <span>{players.length}人で抽選</span>
          <span>前回除外 {excludePrevious ? 'ON' : 'OFF'}</span>
        </div>
        <div
          className="result-grid"
          key={round}
          data-count={players.length}
          data-density={players.length > 4 ? 'compact' : 'regular'}
          data-scroll={players.length > 10 || undefined}
        >
          {players.map((p, i) => {
            const f = fighterById[results[p.id]];
            if (!f) return null;
            const totals = tally(recordsForDay(records, p.id, day, f.id));
            const currentRecord = records.find((r) => r.id === recordIds[p.id]);
            return (
              <motion.article
                key={p.id}
                initial={reducedMotion ? false : { opacity: 0, y: 24, rotateX: 10 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{
                  duration: 0.22,
                  ease: [0.22, 0.9, 0.28, 1],
                  delay: reducedMotion ? 0 : Math.min(i, 5) * 0.045,
                }}
                className={`result-card ${rerolling === p.id ? 'rerolling' : ''}`}
                data-outcome={currentRecord?.outcome ?? 'unrecorded'}
              >
                <div className="result-seat">
                  <span>{i + 1}P</span>
                  <strong>{p.name}</strong>
                </div>
                <button
                  className="result-face"
                  aria-label={`${p.name}：${f.name}。再抽選を表示`}
                  aria-expanded={revealed === p.id}
                  onClick={() => setRevealed(revealed === p.id ? null : p.id)}
                  disabled={busy}
                >
                  <span className="result-english" aria-hidden="true">
                    {f.english}
                  </span>
                  <span className="result-disc" aria-hidden="true" />
                  <motion.span
                    className="result-art"
                    key={f.id}
                    initial={reducedMotion ? false : { opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.24 }}
                  >
                    <FighterArt fighter={f} />
                  </motion.span>
                  <span className="result-label">
                    <span className="result-series">{f.english}</span>
                    <strong>{f.name}</strong>
                    <span className="result-daily">
                      <b>
                        {players.length > 4 ? '' : '今日 '}
                        <em><AnimatedNumber value={totals.draws} /></em>回
                      </b>
                      <span>
                        <em><AnimatedNumber value={totals.wins} /></em>勝 <em><AnimatedNumber value={totals.losses} /></em>敗
                      </span>
                      <b className="result-lifetime">
                        累計 <AnimatedNumber value={playerPoints(records, p.id)} format={formatPoints} />
                      </b>
                    </span>
                  </span>
                  <span className="result-tap" aria-hidden="true">
                    <ArrowsClockwise size={13} />
                    再抽選
                  </span>
                </button>
                {currentRecord && (
                  <div className="result-outcome">
                    {players.length === 1 && (
                      <span>
                        {gameDay(currentRecord.at) === day ? 'この試合の結果' : '前の対戦日の結果'}
                      </span>
                    )}
                    <OutcomeButtons record={currentRecord} change={changeOutcome} disabled={busy} />
                    <button
                      className="result-correct"
                      onClick={() => record(currentRecord.id)}
                      aria-label={`${p.name}の勝敗・ポイントの詳細`}
                    >
                      詳細
                    </button>
                  </div>
                )}
                {revealed === p.id && (
                  <button
                    className="reroll-button"
                    disabled={busy}
                    onClick={() => {
                      setRevealed(null);
                      reroll(p.id);
                    }}
                  >
                    <ArrowsClockwise size={17} />
                    この人だけもう一度
                    <ArrowRight size={17} />
                  </button>
                )}
              </motion.article>
            );
          })}
        </div>
      </main>
      <footer className="dock result-dock">
        <button className="text-button" onClick={back} disabled={busy}>
          メンバー変更
        </button>
        <button
          className="primary"
          disabled={busy}
          onClick={() => {
            setRevealed(null);
            again();
          }}
        >
          <ArrowsClockwise size={21} />
          もう一度抽選
          <ArrowRight size={20} />
        </button>
      </footer>
    </>
  );
}

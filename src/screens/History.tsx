import { useState } from 'react';
import { CaretRight } from '@phosphor-icons/react';
import type { DrawRecord, Player } from '../models/types';
import { fighters, fighterById } from '../data/fighters';
import {
  recordsForDay,
  tally,
  formatPoints,
  recordPoints,
  playerPoints,
} from '../services/drawHistory';
import { FighterArt } from '../components/Art';
import { Back } from '../components/Primitives';
export function History({
  player,
  records,
  day,
  back,
  record,
}: {
  player: Player;
  records: DrawRecord[];
  day: string;
  back: () => void;
  record: (id: string) => void;
}) {
  const [chosenDay, setChosenDay] = useState('');
  const [view, setView] = useState<'fighters' | 'draws'>('fighters');
  const [showZero, setShowZero] = useState(false);
  const selectedDay = chosenDay || day;
  const entries = recordsForDay(records, player.id, selectedDay);
  const total = tally(entries);
  const ids = new Set([...player.candidates, ...entries.map((r) => r.fighterId)]);
  const byFighter = fighters
    .filter((f) => ids.has(f.id))
    .map((f) => ({ fighter: f, ...tally(entries.filter((r) => r.fighterId === f.id)) }))
    .filter((f) => showZero || f.draws > 0 || f.recorded > 0)
    .sort((a, b) => b.draws - a.draws || a.fighter.order - b.fighter.order);
  return (
    <>
      <header className="topbar">
        <Back onClick={back} />
        <h1 className="nav-title">{player.name}の記録</h1>
      </header>
      <main className="history-main" id="main-content">
        <div className="lifetime-points">
          <span>
            本人の累計ポイント<small>全対戦日を集計 / 18時にリセットされません</small>
          </span>
          <strong>{formatPoints(playerPoints(records, player.id))}</strong>
        </div>
        <div className="history-date">
          <label htmlFor="history-day">
            対戦日
            <input
              id="history-day"
              type="date"
              value={selectedDay}
              max={day}
              onChange={(e) => setChosenDay(e.target.value)}
            />
          </label>
          <span>18時から翌18時まで</span>
        </div>
        <div className="history-summary">
          <strong>
            {total.draws}
            <small>回抽選</small>
          </strong>
          <span>
            {total.wins}勝 {total.losses}敗<small>勝敗登録 {total.recorded}試合</small>
            <small className="history-points">この対戦日 {formatPoints(total.points)}</small>
          </span>
        </div>
        <p className="history-note">
          再抽選は勝敗を記録したときだけ出現回数に含めます
          <br />
          勝敗・ポイントは結果を入力したときだけ記録します
        </p>
        <div className="history-tabs" role="group" aria-label="記録の表示">
          <button aria-pressed={view === 'fighters'} onClick={() => setView('fighters')}>
            キャラ別
          </button>
          <button aria-pressed={view === 'draws'} onClick={() => setView('draws')}>
            抽選順・勝敗の訂正
          </button>
        </div>
        {view === 'fighters' ? (
          <>
            <label className="history-zero">
              <input
                type="checkbox"
                checked={showZero}
                onChange={(e) => setShowZero(e.target.checked)}
              />
              出ていない候補も表示
            </label>
            <div className="fighter-totals-head">
              <span>キャラ</span>
              <span>出現</span>
              <span>勝ち</span>
              <span>負け</span>
              <span>pt</span>
            </div>
            {byFighter.map((row) => (
              <div className="fighter-totals" key={row.fighter.id}>
                <span>
                  <FighterArt fighter={row.fighter} portrait />
                  <strong>{row.fighter.name}</strong>
                </span>
                <b>{row.draws}</b>
                <span>{row.wins}</span>
                <span>{row.losses}</span>
                <b>{formatPoints(row.points).replace('pt', '')}</b>
              </div>
            ))}
          </>
        ) : (
          <div className="history-list">
            {[...entries].reverse().map((r) => (
              <button key={r.id} onClick={() => record(r.id)}>
                <FighterArt fighter={fighterById[r.fighterId]} portrait />
                <span>
                  <strong>{fighterById[r.fighterId].name}</strong>
                  <small>
                    {new Intl.DateTimeFormat('ja-JP', {
                      timeZone: 'Asia/Tokyo',
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(r.at)}
                    {r.kind === 'reroll' ? ' 再抽選' : ''} / 候補{r.candidates.length}体
                  </small>
                </span>
                <b>
                  {r.outcome === 'win' ? '勝ち' : r.outcome === 'loss' ? '負け' : '未記録'}
                  {r.outcome && <small>{formatPoints(recordPoints(r))}</small>}
                </b>
                <CaretRight size={15} />
              </button>
            ))}
          </div>
        )}
        {!entries.length && (
          <div className="empty-state">
            <h2>この対戦日の抽選記録はありません</h2>
            <p>この更新以降の抽選から自動で保存します</p>
          </div>
        )}
      </main>
    </>
  );
}

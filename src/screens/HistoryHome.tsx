import { CaretRight } from '@phosphor-icons/react';
import type { DrawRecord, Player } from '../models/types';
import { Back } from '../components/Primitives';
import { recordsForDay, tally, playerPoints, formatPoints } from '../services/drawHistory';
export function HistoryHome({
  players,
  records,
  day,
  back,
  open,
}: {
  players: Player[];
  records: DrawRecord[];
  day: string;
  back: () => void;
  open: (id: string) => void;
}) {
  return (
    <>
      <header className="topbar">
        <Back onClick={back} />
        <h1 className="nav-title">対戦履歴</h1>
      </header>
      <main className="history-main" id="main-content">
        <p className="history-note">
          {day} 18時からの記録
          <br />
          名前を選ぶと抽選順や過去の記録を確認できます
        </p>
        <div className="history-player-list">
          {players.map((p) => {
            const today = tally(recordsForDay(records, p.id, day));
            return (
              <button key={p.id} onClick={() => open(p.id)}>
                <span>
                  <strong>{p.name}</strong>
                  <small>
                    今日 {today.draws}回 / {today.wins}勝 {today.losses}敗
                  </small>
                </span>
                <b>累計 {formatPoints(playerPoints(records, p.id))}</b>
                <CaretRight size={17} />
              </button>
            );
          })}
        </div>
        {!players.length && <p className="history-note">メンバーを登録するとここに表示します</p>}
      </main>
    </>
  );
}

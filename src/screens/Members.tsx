import { FighterArt } from '../components/Art';
import { fighterById } from '../data/fighters';
import {
  Check,
  GearSix,
  ArrowUpRight,
  Shuffle,
  ClockCounterClockwise,
} from '@phosphor-icons/react';
import type { AppData } from '../models/types';
import { SoundToggle, Switch } from '../components/Primitives';

export function Members({
  data,
  toggle,
  settings,
  history,
  exclude,
  sound,
  start,
  busy,
}: {
  data: AppData;
  toggle: (id: string) => void;
  settings: () => void;
  history: () => void;
  exclude: () => void;
  sound: () => void;
  start: () => void;
  busy: boolean;
}) {
  const selectedNames = data.players.filter((p) => data.selected.includes(p.id)).map((p) => p.name);
  return (
    <>
      <header className="lobby-header">
        <a className="lobby-brand" href="#main-content" aria-label="脳THEルーレット">
          <span className="brand-symbol" aria-hidden="true">
            脳
          </span>
          <span>脳THEルーレット</span>
        </a>
        <nav className="lobby-header-actions" aria-label="メニュー">
          <button className="lobby-history" onClick={history}>
            <ClockCounterClockwise size={19} />
            <span>履歴</span>
          </button>
          <button className="lobby-settings" onClick={settings} aria-label="設定">
            <GearSix size={19} />
            <span>設定</span>
          </button>
        </nav>
      </header>
      <main className="lobby" id="main-content">
        <div className="lobby-stage" aria-hidden="true">
          <div className="lobby-title-art">
            <span>ファイター抽選</span>
            <strong>ROULETTE</strong>
          </div>
          <FighterArt
            fighter={fighterById[data.players.find((player) => data.selected.includes(player.id))?.lastFighter ?? '61'] ?? fighterById['61']}
          />
        </div>
        <section className="lobby-console" id="players" aria-labelledby="member-title">
          <div className="lobby-console-heading">
            <div>
              <h1 id="member-title">
                参加者を選ぶ <small>{data.players.length}人</small>
              </h1>
            </div>
            <button
              onClick={settings}
              className="lobby-edit"
              aria-label="メンバー・候補キャラを編集"
            >
              編集
              <ArrowUpRight size={15} />
            </button>
          </div>
          <div className="lobby-player-list">
            {data.players.map((p) => {
              const selected = data.selected.includes(p.id);
              return (
                <button
                  key={p.id}
                  className={`member-card lobby-player ${selected ? 'selected' : ''}`}
                  aria-pressed={selected}
                  onClick={() => toggle(p.id)}
                >
                  <span className="lobby-player-check" aria-hidden="true">
                    {selected && <Check size={14} weight="bold" />}
                  </span>
                  <span className="lobby-player-copy">
                    <strong>{p.name}</strong>
                    <span>候補 {p.candidates.length}体</span>
                  </span>
                </button>
              );
            })}
          </div>
          {data.players.length === 0 && (
            <div className="empty-state">
              <h2>メンバーを追加しよう</h2>
              <button className="secondary" onClick={settings}>
                プレイヤーを追加
              </button>
            </div>
          )}
        </section>
      </main>
      <footer className="lobby-dock">
        <div className="lobby-options">
          <Switch label="前回キャラを除外" checked={data.excludePrevious} onChange={exclude} />
          <SoundToggle enabled={data.sound} onClick={sound} />
        </div>
        <div className="lobby-selection" aria-live="polite">
          <span>{selectedNames.length ? selectedNames.join(' / ') : '参加する人をタップ'}</span>
          <strong>
            {data.selected.length}
            <small>人</small>
          </strong>
        </div>
        <button
          className="primary lobby-start"
          aria-label="START"
          disabled={!data.selected.length || busy}
          onClick={start}
        >
          <Shuffle size={22} />
          <span>抽選する</span>
          <ArrowUpRight size={21} />
        </button>
      </footer>
    </>
  );
}

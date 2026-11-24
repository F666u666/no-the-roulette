import { useState } from 'react';
import { accent } from '../utils/style';
import { Check, DeviceRotate, MagnifyingGlass } from '@phosphor-icons/react';
import { fighters } from '../data/fighters';
import type { Player } from '../models/types';
import { FighterArt } from '../components/Art';
export function Editor({
  player,
  toggle,
  selectAll,
  done,
  busy,
}: {
  player: Player;
  toggle: (id: string) => void;
  selectAll: (selected: boolean) => void;
  done: () => void;
  busy: boolean;
}) {
  const [query, setQuery] = useState('');
  const [selectedOnly, setSelectedOnly] = useState(false);
  const visible = fighters.filter(
    (f) =>
      (!selectedOnly || player.candidates.includes(f.id)) &&
      `${f.name} ${f.english}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const [focusedId, setFocusedId] = useState(player.candidates[0] || '03');
  const featured = fighters.find((fighter) => fighter.id === focusedId) || fighters[0];
  return (
    <div className="editor" style={accent(player.color)}>
      <aside className="editor-spotlight" aria-label="ファイタープレビュー">
        <div className="display" aria-hidden="true">
          PICK
          <br />
          YOURS.
        </div>
        <FighterArt fighter={featured} />
        <div className="spotlight-caption">
          <strong>{featured.name}</strong>
          <span>{player.name}の候補</span>
          <small>{featured.english}</small>
        </div>
      </aside>
      <header className="editor-top">
        <div className="editor-player">
          <span>候補キャラを選ぶ</span>
          <strong>{player.name}</strong>
        </div>
        <div className="editor-count">
          選択中 <b>{player.candidates.length}</b> 体
        </div>
        <button className="editor-done" disabled={!player.candidates.length || busy} onClick={done}>
          完了
          <Check size={18} weight="bold" />
        </button>
      </header>
      <div className="editor-bulk" role="group" aria-label="候補の一括選択">
        <button
          disabled={busy || player.candidates.length === fighters.length}
          onClick={() => selectAll(true)}
        >
          全選択
        </button>
        <button disabled={busy || !player.candidates.length} onClick={() => selectAll(false)}>
          全解除
        </button>
      </div>
      <div className="editor-filterbar">
        <label className="fighter-search">
          <MagnifyingGlass size={18} />
          <input
            aria-label="ファイターを検索"
            placeholder="名前で検索"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="roster-tabs" role="group" aria-label="表示するファイター">
          <button aria-pressed={!selectedOnly} onClick={() => setSelectedOnly(false)}>
            すべて
          </button>
          <button aria-pressed={selectedOnly} onClick={() => setSelectedOnly(true)}>
            選択中
          </button>
        </div>
      </div>
      <div className="rotate-hint">
        <DeviceRotate size={23} />
        <span>横持ちでも選べます</span>
      </div>
      {!player.candidates.length && (
        <p className="editor-min" role="status">
          1体以上選んでください
        </p>
      )}
      {visible.length === 0 && (
        <p className="editor-min" role="status">
          一致するファイターがいません
        </p>
      )}
      <main className="fighter-grid">
        {visible.map((f) => {
          const selected = player.candidates.includes(f.id);
          return (
            <button
              key={f.id}
              className={`fighter-cell ${selected ? 'selected' : ''}`}
              aria-label={f.name}
              aria-pressed={selected}
              onFocus={() => setFocusedId(f.id)}
              onClick={() => {
                setFocusedId(f.id);
                toggle(f.id);
              }}
              disabled={busy}
            >
              <FighterArt fighter={f} portrait />
              {selected && (
                <span className="fighter-check">
                  <Check size={12} weight="bold" />
                </span>
              )}
              <span className="fighter-name">{f.name}</span>
            </button>
          );
        })}
      </main>
    </div>
  );
}

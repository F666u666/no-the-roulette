import { useState } from 'react';
import { Copy, ShareNetwork } from '@phosphor-icons/react';
import type { Player } from '../models/types';
import { fighters, fighterById } from '../data/fighters';
import { createPlayerLink, readPlayerLink, suggestedTarget } from '../services/playerShare';
import type { SharedPlayer } from '../services/playerShare';
import { Dialog } from './Primitives';
import { FighterArt } from './Art';

export function SharePlayerDialog({ player, close }: { player: Player; close: () => void }) {
  const [link] = useState(() => createPlayerLink(player, location.href));
  const [message, setMessage] = useState('');
  const share = async () => {
    try {
      if (!navigator.share) {
        setMessage('下のリンクをコピーして送ってください');
        return;
      }
      await navigator.share({
        title: `${player.name}の候補キャラ`,
        text: `脳THEルーレット ${player.name}の候補キャラ`,
        url: link,
      });
    } catch (e) {
      if (!(e instanceof Error && e.name === 'AbortError'))
        setMessage('下のリンクをコピーして送ってください');
    }
  };
  return (
    <Dialog title={`${player.name}のデータを共有`} onClose={close}>
      <p>
        保存済みの名前と候補{player.candidates.length}体を共有します
        <br />
        ほかの人のデータや抽選履歴は含みません
      </p>
      <div className="share-summary">
        <span>{player.name}</span>
        <strong>
          {player.candidates.length}
          <small>体</small>
        </strong>
      </div>
      <button className="primary" onClick={() => void share()}>
        <ShareNetwork size={19} />
        共有する
      </button>
      <label className="input-label share-link-label" htmlFor="player-share-link">
        共有リンク
      </label>
      <textarea
        id="player-share-link"
        className="share-link"
        readOnly
        value={link}
        onFocus={(e) => e.currentTarget.select()}
      />
      <button
        className="secondary share-copy"
        onClick={() => {
          void navigator.clipboard
            ?.writeText(link)
            .then(() => setMessage('リンクをコピーしました'))
            .catch(() => setMessage('リンクを長押ししてコピーしてください'));
          if (!navigator.clipboard) setMessage('リンクを長押ししてコピーしてください');
        }}
      >
        <Copy size={16} />
        リンクをコピー
      </button>
      <p className="share-status" role="status">
        {message}
      </p>
      <p>候補を変更したら新しいリンクを作って送り直してください</p>
      <button className="text-button share-close" onClick={close}>
        閉じる
      </button>
    </Dialog>
  );
}

export function ReadPlayerLinkDialog({
  close,
  preview,
}: {
  close: () => void;
  preview: (p: SharedPlayer) => void;
}) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  return (
    <Dialog title="共有リンクを読み込む" onClose={close}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          try {
            preview(readPlayerLink(text));
          } catch (e) {
            setError(e instanceof Error ? e.message : 'リンクを確認してください');
          }
        }}
      >
        <label className="input-label" htmlFor="read-player-link">
          送られたURLを貼り付け
        </label>
        <textarea
          id="read-player-link"
          className="share-link"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setError('');
          }}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="https://noujiru3.vercel.app/#player=…"
        />
        {error && (
          <p className="share-error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button type="button" className="secondary" onClick={close}>
            キャンセル
          </button>
          <button className="primary" disabled={!text.trim()}>
            内容を確認
          </button>
        </div>
      </form>
    </Dialog>
  );
}

export function ImportPlayerDialog({
  shared,
  players,
  close,
  apply,
}: {
  shared: SharedPlayer;
  players: Player[];
  close: () => void;
  apply: (targetId: string | null) => void;
}) {
  const [target, setTarget] = useState(() => suggestedTarget(players, shared));
  const existing = players.find((p) => p.id === target);
  const candidateSet = new Set(shared.candidates);
  const ordered = fighters.filter((f) => candidateSet.has(f.id));
  return (
    <Dialog title={`${shared.name}のデータを読み込む`} onClose={close}>
      <div className="share-summary">
        <span>共有された候補</span>
        <strong>
          {shared.candidates.length}
          <small>体</small>
        </strong>
      </div>
      <div className="import-fighters" aria-label="共有された候補キャラ">
        {ordered.map((f) => (
          <span key={f.id} title={f.name}>
            <FighterArt fighter={fighterById[f.id]} portrait />
            <small>{f.name}</small>
          </span>
        ))}
      </div>
      <label className="input-label share-link-label" htmlFor="import-player-target">
        この端末の上書き先
      </label>
      <select
        id="import-player-target"
        className="share-target"
        value={target}
        onChange={(e) => setTarget(e.target.value)}
      >
        <option value="" disabled>
          プレイヤーを選んでください
        </option>
        {players.map((p) => (
          <option value={p.id} key={p.id}>
            {p.name}（候補{p.candidates.length}体）
          </option>
        ))}
        <option value="new">新しいプレイヤーとして追加</option>
      </select>
      <p className="import-description">
        {existing
          ? `「${existing.name}」の名前と候補${existing.candidates.length}体を、共有された${shared.candidates.length}体に更新します`
          : target === 'new'
            ? `「${shared.name}」を新しく追加します`
            : '名前が違う場合も上書きする本人を選べます'}
      </p>
      <p>ほかのプレイヤーと抽選設定は変更しません</p>
      <div className="dialog-actions">
        <button className="secondary" onClick={close}>
          キャンセル
        </button>
        <button
          className="primary"
          disabled={!target || (target !== 'new' && !existing)}
          onClick={() => apply(target === 'new' ? null : target)}
        >
          {target === 'new' ? '追加する' : 'この人だけ上書き'}
        </button>
      </div>
    </Dialog>
  );
}

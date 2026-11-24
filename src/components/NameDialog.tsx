import { useState } from 'react';
import { Dialog } from './Primitives';
export function NameDialog({
  initial,
  onSubmit,
  onClose,
}: {
  initial?: string;
  onSubmit: (name: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial ?? '');
  return (
    <Dialog title={initial ? '名前を変更' : 'プレイヤー追加'} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) onSubmit(name.trim());
        }}
      >
        <label className="input-label" htmlFor="player-name">
          プレイヤー名
        </label>
        <input
          id="player-name"
          autoFocus
          autoComplete="off"
          maxLength={24}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="名前を入力"
        />
        <div className="dialog-actions">
          <button type="button" className="secondary" onClick={onClose}>
            キャンセル
          </button>
          <button className="primary" disabled={!name.trim()}>
            {initial ? '保存' : '追加'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

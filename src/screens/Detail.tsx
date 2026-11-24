import { accent } from '../utils/style';
import {
  PencilSimple,
  CaretRight,
  Trash,
  ShareNetwork,
  ClockCounterClockwise,
} from '@phosphor-icons/react';
import type { Player } from '../models/types';
import { fighterById } from '../data/fighters';
import { FighterArt } from '../components/Art';
import { Back } from '../components/Primitives';
export function Detail({
  player,
  back,
  rename,
  edit,
  remove,
  share,
  history,
}: {
  player: Player;
  back: () => void;
  rename: () => void;
  edit: () => void;
  remove: () => void;
  share: () => void;
  history: () => void;
}) {
  const featured = fighterById[player.lastFighter || player.candidates[0]];
  return (
    <div style={accent(player.color)} className="detail-screen">
      <header className="topbar">
        <Back onClick={back} />
        <span className="nav-title">プレイヤー設定</span>
        <span className="header-spacer" />
      </header>
      <main className="detail-main">
        <div className="profile-hero">
          <div className="profile-art">{featured && <FighterArt fighter={featured} />}</div>
          <div className="profile-identity">
            <p className="profile-fighter-label">
              {player.lastFighter ? '前回のファイター' : '候補からピックアップ'}
              {featured ? ` / ${featured.name}` : ''}
            </p>
            <button className="profile-name" onClick={rename} aria-label="名前を変更">
              {player.name}
              <PencilSimple size={21} />
            </button>
          </div>
        </div>
        <p className="profile-caption">使いたいキャラを選んでおこう</p>
        <button className="candidate-preview" onClick={edit}>
          <span className="preview-title">
            <span>候補キャラ</span>
            <b>
              {player.candidates.length}
              <small>体</small>
            </b>
            <CaretRight size={20} />
          </span>
          <span className="preview-fighters">
            {player.candidates.slice(0, 5).map((id) => (
              <span key={id}>
                <FighterArt fighter={fighterById[id]} portrait />
              </span>
            ))}
          </span>
          <span className="preview-bottom">
            {player.candidates.length > 5 ? `他${player.candidates.length - 5}体` : 'キャラを選ぶ'}
            <span>編集する</span>
          </span>
          <span className="pool-edit-label">候補キャラを編集</span>
        </button>
        <button
          className="secondary share-player-button"
          onClick={share}
          disabled={!player.candidates.length}
        >
          <ShareNetwork size={19} />
          この人のデータを共有
        </button>
        <button className="secondary player-history-button" onClick={history}>
          <ClockCounterClockwise size={19} />
          抽選履歴・勝敗を見る
        </button>
        <button className="delete-player" onClick={remove}>
          <Trash size={18} />
          プレイヤーを削除
        </button>
      </main>
    </div>
  );
}

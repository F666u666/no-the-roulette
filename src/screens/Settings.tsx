import { isStandalone } from '../data/assetUrl';
import { FighterArt } from '../components/Art';
import { fighterById } from '../data/fighters';
import { Plus, CaretRight, CloudCheck, DownloadSimple } from '@phosphor-icons/react';
import type { AppData } from '../models/types';
import { Back, Switch } from '../components/Primitives';
import type { PwaStatus } from '../services/pwa';
export function Settings({
  data,
  back,
  add,
  detail,
  sound,
  pwa,
  update,
  readLink,
}: {
  data: AppData;
  back: () => void;
  add: () => void;
  detail: (id: string) => void;
  sound: () => void;
  pwa: PwaStatus;
  update: () => void;
  readLink: () => void;
}) {
  return (
    <>
      <header className="topbar">
        <Back onClick={back} />
        <span className="nav-title">設定</span>
        <span className="header-meta">{data.players.length}人</span>
      </header>
      <main className="settings-main">
        <div className="crew-hero">
          <h1>いつものメンバー</h1>
          <p>名前と候補キャラを設定</p>
        </div>
        <button className="add-player" onClick={add}>
          <Plus size={22} weight="bold" />
          プレイヤー追加
        </button>
        <button className="secondary read-player-button" onClick={readLink}>
          <DownloadSimple size={19} />
          共有リンクを読み込む
        </button>
        <div className="settings-grid">
          {data.players.map((p) => (
            <button className="settings-card" key={p.id} onClick={() => detail(p.id)}>
              <span className="settings-avatar">
                {fighterById[p.lastFighter || p.candidates[0]] && (
                  <FighterArt fighter={fighterById[p.lastFighter || p.candidates[0]]} portrait />
                )}
              </span>
              <div className="settings-card-label">
                <strong>{p.name}</strong>
                <span>
                  候補 {p.candidates.length}体 <CaretRight size={14} />
                </span>
              </div>
            </button>
          ))}
        </div>
        <section className="preferences">
          <Switch label="効果音" checked={data.sound} onChange={sound} />
          <div className="pwa-status">
            <CloudCheck size={19} />
            <span>
              {pwa.offlineReady
                ? 'オフラインの準備完了'
                : pwa.error
                  ? 'オフライン準備に失敗。通信を確認して再起動'
                  : 'オフラインの準備中'}
            </span>
          </div>
          {pwa.update && (
            <button className="secondary" onClick={update}>
              <DownloadSimple size={18} />
              新しいバージョンを開く
            </button>
          )}
          <details className="fairness-note">
            <summary>抽選のしくみ</summary>
            <p>
              全員同時の抽選では、選んだ候補から重複しない組み合わせを同じ確率で選びます。個別の再抽選は、他の人の表示キャラに関係なく選びます。前回除外がONなら、本人の直前のキャラだけ外します。
            </p>
            <p>
              1人・候補40体・前回除外OFFなら各2.5%。ONで直前の1体を除く場合は、残り39体から各約2.56%です。複数人で候補が異なる場合は、重複を避ける条件によって1体ごとの確率も変わります。
            </p>
            <p>
              過去の出現回数で重みは変えません。40体から10回選ぶと、どこかで同じキャラが再登場する確率は約71%です（1人・前回除外OFFの場合）。
            </p>
          </details>
          <details>
            <summary>ホーム画面に追加</summary>
            <p>
              Safariの共有メニューから「ホーム画面に追加」を選びます。オフラインの準備完了後は、通信なしで遊べます。
            </p>
          </details>
          {!isStandalone() && <p><a href="/effects/index.html">演出プレビュー</a></p>}
          <p className="local-note">この端末に自動保存</p>
        </section>
      </main>
    </>
  );
}

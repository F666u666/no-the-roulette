import { Check, Trophy, XCircle } from '@phosphor-icons/react';
import { useState } from 'react';
import type { DrawRecord, MatchOutcome, MatchBonus } from '../models/types';
import { fighterById } from '../data/fighters';
import {
  gameDay,
  normalBonus,
  bonusMultiplier,
  recordPoints,
  formatPoints,
} from '../services/drawHistory';
import { Dialog } from './Primitives';
import { FighterArt } from './Art';
export function OutcomeButtons({
  record,
  change,
  disabled = false,
}: {
  record: DrawRecord;
  change: (id: string, outcome: MatchOutcome) => void;
  disabled?: boolean;
}) {
  return (
    <div className="outcome-buttons" role="group" aria-label={`${record.playerName}の勝敗`}>
      {(['win', 'loss'] as const).map((outcome) => (
        <button
          key={outcome}
          disabled={disabled}
          className={`outcome-${outcome}`}
          aria-pressed={record.outcome === outcome}
          onClick={() => change(record.id, outcome)}
        >
          {outcome === 'win' ? (
            <Trophy size={16} weight="duotone" />
          ) : (
            <XCircle size={16} weight="duotone" />
          )}
          {record.outcome === outcome && <Check size={12} weight="bold" />}
          {outcome === 'win' ? '勝ち' : '負け'}
        </button>
      ))}
    </div>
  );
}
export function MatchRecordDialog({
  record,
  change,
  changeBonus,
  teammates,
  applyTeam,
  close,
}: {
  record: DrawRecord;
  change: (id: string, outcome: MatchOutcome) => void;
  changeBonus: (id: string, bonus: MatchBonus) => void;
  teammates: DrawRecord[];
  applyTeam: (sourceId: string, targetIds: string[]) => void;
  close: () => void;
}) {
  const fighter = fighterById[record.fighterId];
  const bonus = record.bonus ?? normalBonus;
  const [teamIds, setTeamIds] = useState<string[]>([]);
  return (
    <Dialog title="勝敗・ポイントの記録" onClose={close}>
      <div className="match-record-preview">
        <FighterArt fighter={fighter} />
        <div>
          <strong>{fighter.name}</strong>
          <span>{record.playerName}</span>
          <small>{gameDay(record.at)} 18時からの集計</small>
        </div>
      </div>
      <p>
        このキャラで対戦した1試合の結果を選んでください
        <br />
        押し直すと訂正できます
      </p>
      <OutcomeButtons record={record} change={change} />
      <fieldset className="match-bonuses">
        <legend>この試合に適用するボーナス</legend>
        <label>
          <input
            type="checkbox"
            checked={bonus.threeStocks}
            onChange={(e) => changeBonus(record.id, { ...bonus, threeStocks: e.target.checked })}
          />
          <span>3機残し</span>
          <b>×3</b>
        </label>
        <label>
          <input
            type="checkbox"
            checked={bonus.eightStocks}
            onChange={(e) => changeBonus(record.id, { ...bonus, eightStocks: e.target.checked })}
          />
          <span>チーム8機残し</span>
          <b>×2</b>
        </label>
        <div className="kills-checklist" role="group" aria-label="キル数のボーナス">
          <p className="bonus-section-label">
            キル数 <small>1つ選択 / もう一度押すと解除</small>
          </p>
          {(
            [
              ['eight', '8キル', '×3'],
              ['restricted-eight', '8キル（候補制限）', '×1.5'],
              ['ten', '10キル', '×10'],
              ['twelve', '12キル（全撃破）', '×20'],
              ['six-each', '6キルずつ・2人', '×2'],
              ['three-each', '3キルずつ・4人', '×3'],
            ] as const
          ).map(([value, label, multiplier]) => (
            <label key={value}>
              <input
                type="checkbox"
                checked={bonus.kills === value}
                onChange={(e) =>
                  changeBonus(record.id, { ...bonus, kills: e.target.checked ? value : 'none' })
                }
              />
              <span>{label}</span>
              <b>{multiplier}</b>
            </label>
          ))}
        </div>
        <label>
          <input
            type="checkbox"
            checked={bonus.selfDestruct ?? false}
            onChange={(e) => changeBonus(record.id, { ...bonus, selfDestruct: e.target.checked })}
          />
          <span>自滅</span>
          <b>×−2</b>
        </label>
        <small>自滅は通常倍率の2倍を減点します。8キルの条件なら−6ptです</small>
      </fieldset>
      <div className="match-point-preview" aria-live="polite">
        <span>
          1 × {bonusMultiplier(bonus)}
          {bonus.selfDestruct && ' × −2'}
          <small>
            {bonus.selfDestruct ? '自滅は勝敗にかかわらず減点' : '勝ちなら加点 / 負けなら減点'}
          </small>
        </span>
        <strong>
          {record.outcome === null ? '勝敗未記録' : formatPoints(recordPoints(record))}
        </strong>
      </div>
      {teammates.length > 0 && (
        <details className="team-match-record">
          <summary>同じチームの人にも反映</summary>
          <p>同じチームの人だけ選んでください。自滅の減点も一緒に反映します</p>
          {teammates.map((r) => (
            <label key={r.id}>
              <input
                type="checkbox"
                checked={teamIds.includes(r.id)}
                onChange={(e) => {
                  setTeamIds(
                    e.target.checked ? [...teamIds, r.id] : teamIds.filter((id) => id !== r.id),
                  );
                }}
              />
              {r.playerName}
            </label>
          ))}
          <button
            className="secondary"
            disabled={!teamIds.length || record.outcome === null}
            onClick={() => {
              applyTeam(record.id, teamIds);
              close();
            }}
          >
            選んだ{teamIds.length}人にこの勝敗・条件を反映
          </button>
        </details>
      )}
      <button
        className="text-button record-clear"
        disabled={record.outcome === null}
        onClick={() => change(record.id, null)}
      >
        未記録に戻す
      </button>
      <button className="primary" onClick={close}>
        閉じる
      </button>
    </Dialog>
  );
}

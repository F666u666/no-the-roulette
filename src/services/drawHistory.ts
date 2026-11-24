import type { DrawRecord, Player, Results, MatchOutcome, MatchBonus } from '../models/types';
export const normalBonus: MatchBonus = {
  version: 1,
  threeStocks: false,
  eightStocks: false,
  kills: 'none',
};
export function validBonus(value: unknown): value is MatchBonus {
  if (!value || typeof value !== 'object') return false;
  const b = value as MatchBonus;
  return (
    b.version === 1 &&
    typeof b.threeStocks === 'boolean' &&
    typeof b.eightStocks === 'boolean' &&
    (b.selfDestruct === undefined || typeof b.selfDestruct === 'boolean') &&
    ['none', 'eight', 'restricted-eight', 'ten', 'twelve', 'six-each', 'three-each'].includes(
      b.kills,
    )
  );
}
export function bonusMultiplier(b: MatchBonus = normalBonus): number {
  const kills = {
    none: 1,
    eight: 3,
    'restricted-eight': 1.5,
    ten: 10,
    twelve: 20,
    'six-each': 2,
    'three-each': 3,
  }[b.kills];
  return (b.threeStocks ? 3 : 1) * (b.eightStocks ? 2 : 1) * kills;
}
export function recordPoints(record: DrawRecord): number {
  return record.outcome === null
    ? 0
    : bonusMultiplier(record.bonus) *
        (record.bonus?.selfDestruct ? -2 : record.outcome === 'win' ? 1 : -1);
}
export function applyMatchToPlayers(
  records: DrawRecord[],
  sourceId: string,
  targetIds: readonly string[],
): DrawRecord[] {
  const source = records.find((r) => r.id === sourceId);
  if (!source || source.outcome === null) return records;
  const targets = new Set(targetIds);
  return records.map((r) =>
    targets.has(r.id) && r.id !== sourceId
      ? { ...r, outcome: source.outcome, bonus: { ...(source.bonus ?? normalBonus) } }
      : r,
  );
}
export function formatPoints(points: number): string {
  return `${points > 0 ? '+' : points < 0 ? '−' : ''}${Math.abs(points)}pt`;
}
/** Lifetime score is derived from all saved matches, never the current game day. */
export function playerPoints(records: readonly DrawRecord[], playerId: string): number {
  return records.reduce((sum, r) => sum + (r.playerId === playerId ? recordPoints(r) : 0), 0);
}
export function setRecordBonus(records: DrawRecord[], id: string, bonus: MatchBonus): DrawRecord[] {
  if (!validBonus(bonus)) throw new Error('ポイント条件を確認できません');
  return records.map((r) => (r.id === id ? { ...r, bonus: { ...bonus } } : r));
}
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
/** Japan's 18:00 boundary is 09:00 UTC. A night belongs to the date it started. */
export function gameDay(at: number): string {
  return new Date(at - 9 * HOUR).toISOString().slice(0, 10);
}
export function nextGameDayBoundary(at: number): number {
  return (Math.floor((at - 9 * HOUR) / DAY) + 1) * DAY + 9 * HOUR;
}
export function createDrawRecords(
  players: readonly Player[],
  results: Results,
  exclude: boolean,
  kind: DrawRecord['kind'],
  at: number,
  makeId = () => crypto.randomUUID(),
): DrawRecord[] {
  return players
    .filter((p) => results[p.id])
    .map((p) => ({
      id: makeId(),
      playerId: p.id,
      playerName: p.name,
      fighterId: results[p.id],
      at,
      candidates: [...new Set(p.candidates)],
      excludePrevious: exclude,
      previousFighter: p.lastFighter,
      kind,
      outcome: null,
    }));
}
export function recordsForDay(
  records: readonly DrawRecord[],
  playerId: string,
  day: string,
  fighterId?: string,
): DrawRecord[] {
  return records.filter(
    (r) =>
      r.playerId === playerId && gameDay(r.at) === day && (!fighterId || r.fighterId === fighterId),
  );
}
export function tally(records: readonly DrawRecord[]) {
  const wins = records.filter((r) => r.outcome === 'win').length;
  const losses = records.filter((r) => r.outcome === 'loss').length;
  return {
    // Unused rerolls are excluded; recording a match confirms the appearance.
    draws: records.filter((r) => r.kind === 'draw' || r.outcome !== null).length,
    wins,
    losses,
    recorded: wins + losses,
    unrecorded: records.length - wins - losses,
    points: records.reduce((sum, record) => sum + recordPoints(record), 0),
  };
}
export function setRecordOutcome(
  records: DrawRecord[],
  id: string,
  outcome: MatchOutcome,
): DrawRecord[] {
  if (!records.some((r) => r.id === id && r.outcome !== outcome)) return records;
  return records.map((r) => (r.id === id ? { ...r, outcome } : r));
}

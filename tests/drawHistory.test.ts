import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import {
  gameDay,
  nextGameDayBoundary,
  createDrawRecords,
  recordsForDay,
  tally,
  setRecordOutcome,
} from '../src/services/drawHistory';
import { defaultData } from '../src/data/defaults';
import { migrate, loadData, saveData } from '../src/services/storage';
const at = (s: string) => Date.parse(s);
const when = at('2026-11-05T23:00:00+09:00');
const makeRecords = () =>
  createDrawRecords(
    defaultData().players.slice(0, 2),
    { 'initial-1': '01', 'initial-2': '06' },
    true,
    'draw',
    when,
    (() => {
      let n = 0;
      return () => `record-${++n}`;
    })(),
  );
describe('18:00 JST personal records', () => {
  it('counts a reroll only once its outcome is recorded, even after correction', () => {
    const rerolls = makeRecords().map((r) => ({ ...r, kind: 'reroll' as const }));
    expect(tally(rerolls)).toEqual({
      draws: 0,
      wins: 0,
      losses: 0,
      recorded: 0,
      unrecorded: 2,
      points: 0,
    });
    const mixed = [makeRecords()[0], { ...rerolls[0], id: 'another' }];
    expect(tally(mixed).draws).toBe(1);
    const played = setRecordOutcome(rerolls, 'record-1', 'win');
    expect(tally(played)).toEqual({
      draws: 1,
      wins: 1,
      losses: 0,
      recorded: 1,
      unrecorded: 1,
      points: 1,
    });
    expect(tally(setRecordOutcome(played, 'record-1', 'loss')).draws).toBe(1);
    expect(tally(setRecordOutcome(played, 'record-1', null)).draws).toBe(0);
    expect(tally(rerolls).points).toBe(0);
  });
  it('counts confirmed rerolls on both sides of 18:00 after saving and reopening', async () => {
    const data = defaultData();
    const player = data.players[0];
    const times = [
      '2026-11-08T17:59:59.999+09:00',
      '2026-11-08T18:00:00+09:00',
      '2026-11-09T08:00:00+09:00',
      '2026-11-09T18:00:00+09:00',
    ];
    data.drawHistory = times.flatMap((time, i) =>
      createDrawRecords(
        [player],
        { [player.id]: '01' },
        true,
        'reroll',
        at(time),
        () => `reroll-${i}`,
      ),
    );
    data.drawHistory = setRecordOutcome(data.drawHistory, 'reroll-0', 'win');
    data.drawHistory = setRecordOutcome(data.drawHistory, 'reroll-1', 'win');
    data.drawHistory = setRecordOutcome(data.drawHistory, 'reroll-2', 'loss');
    await saveData(data);
    const saved = await loadData();
    const total = (time: string) =>
      tally(recordsForDay(saved.drawHistory, player.id, gameDay(at(time)), '01'));
    expect(total(times[0])).toMatchObject({ draws: 1, wins: 1 });
    expect(total(times[1])).toMatchObject({ draws: 2, wins: 1, losses: 1 });
    expect(total(times[3])).toMatchObject({ draws: 0, wins: 0, losses: 0 });
    const confirmed = setRecordOutcome(saved.drawHistory, 'reroll-3', 'win');
    expect(tally(recordsForDay(confirmed, player.id, gameDay(at(times[3])), '01'))).toMatchObject({
      draws: 1,
      wins: 1,
    });
  });
  it('keeps 23:00 and next morning 08:00 in one day and changes exactly at 18:00', () => {
    expect(gameDay(at('2026-11-05T17:59:59.999+09:00'))).toBe('2026-11-04');
    expect(gameDay(at('2026-11-05T18:00:00+09:00'))).toBe('2026-11-05');
    expect(gameDay(when)).toBe('2026-11-05');
    expect(gameDay(at('2026-11-06T08:00:00+09:00'))).toBe('2026-11-05');
    expect(gameDay(at('2026-11-06T17:59:59.999+09:00'))).toBe('2026-11-05');
    expect(gameDay(at('2026-11-06T18:00:00+09:00'))).toBe('2026-11-06');
  });
  it('schedules the next boundary using fixed Japanese time', () => {
    expect(nextGameDayBoundary(when)).toBe(at('2026-11-06T18:00:00+09:00'));
    expect(nextGameDayBoundary(at('2026-11-05T17:59:59+09:00'))).toBe(
      at('2026-11-05T18:00:00+09:00'),
    );
    expect(nextGameDayBoundary(at('2026-11-05T18:00:00+09:00'))).toBe(
      at('2026-11-06T18:00:00+09:00'),
    );
  });
  it('captures only successfully drawn players with their exact candidate and previous-state snapshots', () => {
    const p = defaultData().players[0];
    p.candidates = ['01', '06'];
    p.lastFighter = '06';
    const records = createDrawRecords([p], { [p.id]: '01' }, true, 'reroll', when, () => 'unique');
    expect(records[0]).toMatchObject({
      id: 'unique',
      fighterId: '01',
      candidates: ['01', '06'],
      previousFighter: '06',
      excludePrevious: true,
      kind: 'reroll',
      outcome: null,
    });
    p.candidates.push('61');
    expect(records[0].candidates).toEqual(['01', '06']);
    expect(createDrawRecords([p], {}, true, 'draw', when)).toEqual([]);
  });
  it('isolates each player, fighter and day without deleting old records', () => {
    const records = makeRecords();
    expect(tally(recordsForDay(records, 'initial-1', '2026-11-05', '01')).draws).toBe(1);
    expect(tally(recordsForDay(records, 'initial-1', '2026-11-05', '06')).draws).toBe(0);
    expect(tally(recordsForDay(records, 'initial-2', '2026-11-05', '06')).draws).toBe(1);
    expect(recordsForDay(records, 'initial-1', '2026-11-06')).toEqual([]);
    expect(records).toHaveLength(2);
  });
  it('records once, corrects without double counting, and can return to unrecorded', () => {
    const records = makeRecords();
    const won = setRecordOutcome(records, 'record-1', 'win');
    expect(setRecordOutcome(won, 'record-1', 'win')).toBe(won);
    expect(tally(won)).toEqual({
      draws: 2,
      wins: 1,
      losses: 0,
      recorded: 1,
      unrecorded: 1,
      points: 1,
    });
    const lost = setRecordOutcome(won, 'record-1', 'loss');
    expect(tally(lost)).toEqual({
      draws: 2,
      wins: 0,
      losses: 1,
      recorded: 1,
      unrecorded: 1,
      points: -1,
    });
    expect(tally(setRecordOutcome(lost, 'record-1', null))).toEqual({
      draws: 2,
      wins: 0,
      losses: 0,
      recorded: 0,
      unrecorded: 2,
      points: 0,
    });
    expect(setRecordOutcome(records, 'missing', 'win')).toBe(records);
    expect(records.every((r) => r.outcome === null)).toBe(true);
    expect(won[1]).toBe(records[1]);
  });
  it('adds empty history to an old save while preserving candidates, selection, previous fighter and draft', () => {
    const original = defaultData();
    original.players[0].candidates = ['01', '06'];
    original.players[0].lastFighter = '06';
    original.selected = ['initial-1'];
    original.editingPlayer = 'initial-1';
    const old = { ...original, drawHistory: undefined };
    expect(migrate(old)).toEqual(original);
  });
  it('rejects corrupt and duplicate history instead of silently dropping user records', () => {
    const data = { ...defaultData(), drawHistory: makeRecords() };
    expect(() =>
      migrate({ ...data, drawHistory: [...data.drawHistory, data.drawHistory[0]] }),
    ).toThrow();
    expect(() =>
      migrate({ ...data, drawHistory: [{ ...data.drawHistory[0], fighterId: 'unknown' }] }),
    ).toThrow();
    expect(() =>
      migrate({ ...data, drawHistory: [{ ...data.drawHistory[0], outcome: 'other' }] }),
    ).toThrow();
    expect(() =>
      migrate({ ...data, drawHistory: [{ ...data.drawHistory[0], at: NaN }] }),
    ).toThrow();
  });
  it('persists outcomes across a reload through the existing storage format', async () => {
    const data = {
      ...defaultData(),
      drawHistory: setRecordOutcome(makeRecords(), 'record-1', 'win'),
    };
    await saveData(data);
    expect(await loadData()).toEqual(data);
  });
});

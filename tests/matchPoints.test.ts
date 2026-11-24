import { describe, it, expect } from 'vitest';
import { defaultData } from '../src/data/defaults';
import { migrate } from '../src/services/storage';
import {
  normalBonus,
  bonusMultiplier,
  createDrawRecords,
  setRecordBonus,
  setRecordOutcome,
  recordPoints,
  tally,
  playerPoints,
  gameDay,
  recordsForDay,
  applyMatchToPlayers,
} from '../src/services/drawHistory';
const records = () =>
  createDrawRecords(
    defaultData().players.slice(0, 1),
    { 'initial-1': '01' },
    true,
    'draw',
    Date.parse('2026-11-05T23:00:00+09:00'),
    () => 'r1',
  );
describe('non-monetary match points', () => {
  it('deducts twice the normal bonus for self-destruction and never turns a loss into a reward', () => {
    const data = setRecordBonus(records(), 'r1', {
      ...normalBonus,
      kills: 'eight',
      selfDestruct: true,
    });
    expect(recordPoints(setRecordOutcome(data, 'r1', 'loss')[0])).toBe(-6);
    expect(recordPoints(setRecordOutcome(data, 'r1', 'win')[0])).toBe(-6);
    expect(recordPoints(data[0])).toBe(0);
    expect(
      recordPoints(
        setRecordOutcome(
          setRecordBonus(records(), 'r1', { ...normalBonus, selfDestruct: true }),
          'r1',
          'loss',
        )[0],
      ),
    ).toBe(-2);
    expect(() =>
      migrate({
        ...defaultData(),
        drawHistory: [{ ...data[0], bonus: { ...normalBonus, selfDestruct: 'yes' } }],
      }),
    ).toThrow();
  });
  it('copies outcomes and bonus conditions only to the selected teammates without double counting', () => {
    const source = setRecordOutcome(
      setRecordBonus(records(), 'r1', { ...normalBonus, kills: 'eight', selfDestruct: true }),
      'r1',
      'loss',
    )[0];
    const mate = { ...records()[0], id: 'mate', playerId: 'initial-2' };
    const opponent = { ...mate, id: 'opponent', playerId: 'initial-3' };
    const data = [source, mate, opponent];
    const applied = applyMatchToPlayers(data, 'r1', ['mate']);
    expect(recordPoints(applied[0])).toBe(-6);
    expect(recordPoints(applied[1])).toBe(-6);
    expect(applied[2]).toBe(opponent);
    expect(playerPoints(applyMatchToPlayers(applied, 'r1', ['mate']), mate.playerId)).toBe(-6);
    expect(data[1].outcome).toBeNull();
    expect(applyMatchToPlayers(data, 'missing', ['mate'])).toBe(data);
    expect(applyMatchToPlayers([mate], 'mate', ['opponent'])).toEqual([mate]);
  });
  it('applies the 12-kill and team-distribution rules without overlapping kill multipliers', () => {
    expect(bonusMultiplier({ ...normalBonus, kills: 'twelve' })).toBe(20);
    expect(bonusMultiplier({ ...normalBonus, kills: 'six-each' })).toBe(2);
    expect(bonusMultiplier({ ...normalBonus, kills: 'three-each' })).toBe(3);
    expect(bonusMultiplier({ ...normalBonus, kills: 'twelve', eightStocks: true })).toBe(40);
    for (const kills of ['twelve', 'six-each', 'three-each'] as const) {
      const entries = setRecordBonus(records(), 'r1', { ...normalBonus, kills });
      expect(recordPoints(setRecordOutcome(entries, 'r1', 'loss')[0])).toBe(
        -bonusMultiplier(entries[0].bonus),
      );
      expect(migrate({ ...defaultData(), drawHistory: entries }).drawHistory).toEqual(entries);
    }
  });
  it('keeps a personal lifetime total when the game day changes at 18:00', () => {
    const first = setRecordOutcome(
      setRecordBonus(records(), 'r1', { ...normalBonus, kills: 'twelve' }),
      'r1',
      'win',
    )[0];
    const nextAt = Date.parse('2026-11-06T18:00:00+09:00');
    const otherDay = {
      ...first,
      id: 'next',
      at: nextAt,
      outcome: 'loss' as const,
      bonus: normalBonus,
    };
    const otherPerson = { ...first, id: 'other', playerId: 'initial-2' };
    const all = [first, otherDay, otherPerson];
    expect(tally(recordsForDay(all, first.playerId, gameDay(nextAt - 1))).points).toBe(20);
    expect(tally(recordsForDay(all, first.playerId, gameDay(nextAt))).points).toBe(-1);
    expect(playerPoints(all, first.playerId)).toBe(19);
    expect(playerPoints(all, 'initial-2')).toBe(20);
    expect(playerPoints(setRecordOutcome(all, 'r1', 'loss'), first.playerId)).toBe(-21);
    expect(playerPoints(setRecordOutcome(all, 'r1', null), first.playerId)).toBe(-1);
    expect(all).toHaveLength(3);
  });
  it('multiplies 8 kills and 8 remaining stocks to 6, with signed outcomes', () => {
    const data = setRecordBonus(records(), 'r1', {
      ...normalBonus,
      eightStocks: true,
      kills: 'eight',
    });
    expect(recordPoints(data[0])).toBe(0);
    expect(recordPoints(setRecordOutcome(data, 'r1', 'win')[0])).toBe(6);
    expect(recordPoints(setRecordOutcome(data, 'r1', 'loss')[0])).toBe(-6);
    expect(
      recordPoints(
        setRecordOutcome(
          setRecordBonus(records(), 'r1', { ...normalBonus, kills: 'eight' }),
          'r1',
          'loss',
        )[0],
      ),
    ).toBe(-3);
  });
  it('uses only the 10-kill factor and supports fractional and combined bonuses', () => {
    expect(bonusMultiplier({ ...normalBonus, kills: 'ten' })).toBe(10);
    expect(bonusMultiplier({ ...normalBonus, kills: 'restricted-eight' })).toBe(1.5);
    expect(
      bonusMultiplier({ ...normalBonus, threeStocks: true, eightStocks: true, kills: 'ten' }),
    ).toBe(60);
    expect(
      bonusMultiplier({
        ...normalBonus,
        threeStocks: true,
        eightStocks: true,
        kills: 'restricted-eight',
      }),
    ).toBe(9);
  });
  it('recomputes corrections once without changing another record or original data', () => {
    const original = records();
    let changed = setRecordOutcome(original, 'r1', 'win');
    changed = setRecordBonus(changed, 'r1', { ...normalBonus, kills: 'eight' });
    expect(tally(changed).points).toBe(3);
    expect(tally(setRecordOutcome(changed, 'r1', 'win')).points).toBe(3);
    expect(tally(setRecordOutcome(changed, 'r1', 'loss')).points).toBe(-3);
    expect(tally(setRecordOutcome(changed, 'r1', null)).points).toBe(0);
    expect(original[0].bonus).toBeUndefined();
    expect(original[0].outcome).toBeNull();
  });
  it('preserves earlier saves and validates persisted bonus rules', () => {
    const old = { ...defaultData(), drawHistory: records() };
    expect(migrate(old)).toEqual(old);
    const updated = {
      ...old,
      drawHistory: setRecordBonus(old.drawHistory, 'r1', { ...normalBonus, kills: 'ten' }),
    };
    expect(migrate(updated)).toEqual(updated);
    for (const bonus of [
      { ...normalBonus, version: 2 },
      { ...normalBonus, kills: 'thirty' },
      { ...normalBonus, eightStocks: 'true' },
      null,
    ]) {
      expect(() => migrate({ ...old, drawHistory: [{ ...old.drawHistory[0], bonus }] })).toThrow();
    }
  });
});

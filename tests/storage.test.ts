import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { loadData, saveData, migrate } from '../src/services/storage';
import { defaultData } from '../src/data/defaults';
describe('versioned IndexedDB storage', () => {
  it('creates and persists all settings, selected players, candidates, previous fighter and editor draft', async () => {
    const data = await loadData();
    data.selected = ['initial-2'];
    data.sound = false;
    data.excludePrevious = false;
    data.editingPlayer = 'initial-2';
    data.players[1].name = '変更後';
    data.players[1].candidates = ['01', '82'];
    data.players[1].lastFighter = '82';
    await saveData(data);
    expect(await loadData()).toEqual(data);
  });
  it('rejects unknown future data instead of overwriting it', () =>
    expect(() => migrate({ ...defaultData(), version: 2 })).toThrow());
  it('rejects malformed players and unknown fighters', () => {
    const d = defaultData();
    d.players[0].candidates = ['not-a-fighter'];
    expect(() => migrate(d)).toThrow();
    expect(() => migrate({ version: 1 })).toThrow();
  });
  it('drops deleted member selections during migration', () =>
    expect(
      migrate({ ...defaultData(), selected: ['missing', 'initial-1', 'initial-1'] }).selected,
    ).toEqual(['initial-1']));
});

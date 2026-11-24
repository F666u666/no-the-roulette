import { describe, expect, it } from 'vitest';
import { fighters } from '../src/data/fighters';
import { defaultData } from '../src/data/defaults';
import { migrate } from '../src/services/storage';
import {
  createPlayerLink,
  readPlayerHash,
  readPlayerLink,
  suggestedTarget,
  importPlayer,
} from '../src/services/playerShare';

const shared = { name: 'うろたんげだまや', candidates: fighters.slice(0, 40).map((f) => f.id) };
const pack = (payload: unknown) =>
  '#player=' + Buffer.from(JSON.stringify(payload)).toString('base64url');
describe('one-player sharing', () => {
  it('shares existing saved settings, including Japanese names and all 89 fighters', () => {
    const player = migrate(defaultData()).players[5];
    const link = createPlayerLink(player, 'https://noujiru3.vercel.app/?old=1#main-content');
    const url = new URL(link);
    expect(url.search).toBe('');
    expect(link.length).toBeLessThan(2048);
    expect(readPlayerLink(link)).toEqual({ name: player.name, candidates: player.candidates });
    expect(link).not.toContain('lastFighter');
  });
  it('replaces only the chosen existing player and preserves everyone else and app settings', () => {
    const previous = defaultData();
    previous.players[5].lastFighter = fighters[0].id;
    previous.selected = [previous.players[0].id, previous.players[5].id];
    const before = structuredClone(previous);
    const target = suggestedTarget(previous.players, shared);
    const { data, playerId } = importPlayer(previous, shared, target);
    expect(playerId).toBe(previous.players[5].id);
    expect(data.players).toHaveLength(10);
    expect(data.players[5]).toEqual({ ...before.players[5], ...shared });
    expect(data.players.filter((p) => p.id !== target)).toEqual(
      before.players.filter((p) => p.id !== target),
    );
    expect({ ...data, players: [] }).toEqual({ ...before, players: [] });
    expect(previous).toEqual(before);
    expect(migrate(data)).toEqual(data);
  });
  it('does not guess by order or a duplicate name', () => {
    const players = defaultData().players;
    expect(suggestedTarget(players, { ...shared, name: '別の名前' })).toBe('');
    expect(suggestedTarget([...players, { ...players[5], id: 'duplicate' }], shared)).toBe('');
  });
  it('requires a valid target instead of overwriting another person when a target disappeared', () => {
    expect(() => importPlayer(defaultData(), shared, 'does-not-exist')).toThrow('選び直して');
  });
  it('adds a new person only when explicitly requested, without replacing an existing person', () => {
    const before = defaultData();
    const { data, playerId } = importPlayer(before, shared, null);
    expect(data.players.slice(0, 10)).toEqual(before.players);
    expect(data.players[10]).toMatchObject({ ...shared, id: playerId, lastFighter: null });
    expect(migrate(data)).toEqual(data);
  });
  it('ignores unrelated fragments and rejects broken, oversized and unsupported links', () => {
    expect(readPlayerHash('#main-content')).toBeNull();
    for (const hash of [
      '#player=',
      '#player=%',
      '#player=' + 'a'.repeat(2049),
      pack(null),
      pack({ app: 'other', v: 1, ...shared }),
      pack({ app: 'no-the-roulette', v: 2, ...shared }),
    ])
      expect(() => readPlayerHash(hash)).toThrow();
    expect(() => readPlayerLink('javascript:alert(1)')).toThrow();
    expect(() => readPlayerLink('https://noujiru3.vercel.app/')).toThrow();
  });
  it('rejects unknown or duplicate fighters, empty pools and invalid names without importing anything', () => {
    for (const changes of [
      { candidates: [] },
      { candidates: ['unknown'] },
      { candidates: [fighters[0].id, fighters[0].id] },
      { name: '' },
      { name: 'x'.repeat(25) },
      { name: 'bad\nname' },
    ]) {
      expect(() =>
        readPlayerHash(pack({ app: 'no-the-roulette', v: 1, ...shared, ...changes })),
      ).toThrow();
    }
  });
});

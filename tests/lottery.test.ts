import { describe, it, expect } from 'vitest';
import { drawAll, drawOne, randomBelow, LotteryCapacityError } from '../src/services/lottery';
import { createPlayer, defaultData } from '../src/data/defaults';
import { colorForName, iconForName } from '../src/utils/identity';
import { fighters } from '../src/data/fighters';
import type { Player } from '../src/models/types';
const p = (id: string, candidates: string[], lastFighter: string | null = null): Player => ({
  ...createPlayer(id, id),
  candidates,
  lastFighter,
});
function seeded(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
function brute(players: Player[], used = new Set<string>(), i = 0): boolean {
  if (i === players.length) return true;
  return players[i].candidates.some((f) => {
    if (used.has(f)) return false;
    used.add(f);
    const ok = brute(players, used, i + 1);
    used.delete(f);
    return ok;
  });
}
describe('complete unique matching', () => {
  it('reassigns earlier choices instead of failing a greedy trap', () => {
    const players = [p('A', ['01', '02']), p('B', ['01'])];
    for (let seed = 0; seed < 100; seed++)
      expect(drawAll(players, false, seeded(seed))).toEqual({ A: '02', B: '01' });
  });
  it('detects Hall violations even when total candidate union is large enough', () =>
    expect(drawAll([p('a', ['01']), p('b', ['01']), p('c', ['02', '03'])], false)).toBeNull());
  it('agrees with exhaustive search for 700 generated candidate graphs', () => {
    const rng = seeded(24);
    for (let run = 0; run < 700; run++) {
      const ps = Array.from({ length: 1 + Math.floor(rng() * 6) }, (_, i) =>
        p(
          String(i),
          ['a', 'b', 'c', 'd', 'e', 'f'].filter(() => rng() < 0.4),
        ),
      );
      const result = drawAll(ps, false, rng);
      expect(result !== null).toBe(brute(ps));
      if (result) {
        expect(new Set(Object.values(result)).size).toBe(ps.length);
        for (const player of ps) expect(player.candidates).toContain(result[player.id]);
      }
    }
  });
  it('excludes each immediate previous fighter', () => {
    const ps = [p('a', ['01', '02'], '01'), p('b', ['01', '02'], '02')];
    expect(drawAll(ps, true)).toEqual({ a: '02', b: '01' });
    expect(drawAll([p('a', ['01'], '01')], true)).toBeNull();
    expect(drawAll([p('a', ['01'], '01')], false)).toEqual({ a: '01' });
  });
  it('samples all nine remaining candidates without excluding other displayed fighters', () => {
    const candidates = Array.from({ length: 10 }, (_, i) => String(i));
    const player = p('a', candidates, '0');
    const outcomes = Array.from({ length: 9 }, (_, ticket) =>
      drawOne(player, true, () => ticket / 4294967296),
    );
    expect(outcomes).toEqual(candidates.slice(1));
    expect(outcomes).toContain('2'); // Still eligible even when another card shows this fighter.
    expect(outcomes).not.toContain('0');
    expect(drawOne(p('a', ['01'], '01'), true)).toBeNull();
    expect(drawOne(p('a', ['01'], '01'), false)).toBe('01');
  });
  it('supports the whole roster without a player cap', () => {
    const ps = Array.from({ length: 89 }, (_, i) =>
      p(
        String(i),
        fighters.map((f) => f.id),
      ),
    );
    expect(Object.keys(drawAll(ps, false)!)).toHaveLength(89);
    expect(
      drawAll(
        [
          ...ps,
          p(
            'extra',
            fighters.map((f) => f.id),
          ),
        ],
        false,
      ),
    ).toBeNull();
  });
});
describe('initial data and deterministic identity', () => {
  it('includes DLC, echoes, all 3 Mii types and all 89 numbered fighters', () => {
    expect(fighters).toHaveLength(89);
    expect(new Set(fighters.map((f) => f.id)).size).toBe(89);
    expect(fighters.at(-1)?.name).toBe('ソラ');
    expect(fighters.filter((f) => ['51', '52', '53'].includes(f.id))).toHaveLength(3);
  });
  it('seeds exactly the requested ten names with candidates', () => {
    expect(defaultData().players.map((p) => p.name)).toEqual([
      'いっさ',
      'ジェン',
      'NO6',
      'おろしポンズ',
      'HERO',
      'うろたんげだまや',
      'ゴッホ',
      'かば',
      'ハリソン',
      'はかせ',
    ]);
    expect(defaultData().players.every((p) => p.candidates.length === 89)).toBe(true);
  });
  it('retains identity on rename and repeats identity from the same name', () => {
    const player = createPlayer('名前');
    const renamed = { ...player, name: '別名' };
    expect(renamed.color).toBe(colorForName('名前'));
    expect(renamed.icon).toBe(iconForName('名前'));
    expect(createPlayer('名前').color).toBe(player.color);
  });
});

describe('fair sampling', () => {
  function rng(seed = 123456) {
    return () => {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  it('weights each valid asymmetric assignment equally across the exact integer decision tree', () => {
    const ps = [p('A', ['a', 'b']), p('B', ['b', 'c'])];
    const weights: Record<string, number> = {};
    // Root has 3 tickets; the two tickets taking A=a each branch into 2 equiprobable suffixes.
    for (const [tickets, weight] of [
      [[0], 2],
      [[1, 0], 1],
      [[1, 1], 1],
      [[2, 0], 1],
      [[2, 1], 1],
    ] as [number[], number][]) {
      let index = 0;
      const result = drawAll(ps, false, () => (tickets[index++] ?? 0) / 4294967296)!;
      const outcome = result.A + result.B;
      weights[outcome] = (weights[outcome] ?? 0) + weight;
    }
    expect(weights).toEqual({ ab: 2, ac: 2, bc: 2 });
  });
  it('keeps 40 fighters uniform for both a single player and four overlapping identical pools', () => {
    const candidates = Array.from({ length: 40 }, (_, i) => String(i));
    const ps = Array.from({ length: 4 }, (_, i) => p(String(i), candidates));
    const source = rng();
    const counts = ps.map(() => Array<number>(40).fill(0));
    for (let i = 0; i < 20000; i++) {
      const result = drawAll(ps, false, source)!;
      for (let j = 0; j < 4; j++) counts[j][Number(result[String(j)])]++;
    }
    for (const row of counts) {
      const chi2 = row.reduce((sum, n) => sum + (n - 500) ** 2 / 500, 0);
      expect(chi2).toBeLessThan(100);
    }
    const solo = Array<number>(40).fill(0);
    for (let i = 0; i < 20000; i++) solo[Number(drawOne(ps[0], false, source))]++;
    expect(solo.reduce((sum, n) => sum + (n - 500) ** 2 / 500, 0)).toBeLessThan(100);
  });
  it('does not bias the common assignment in the old augmenting-path counterexample', () => {
    const counts = { ab: 0, ac: 0, bc: 0 };
    const source = rng(35);
    for (let i = 0; i < 12000; i++) {
      const result = drawAll([p('A', ['a', 'b']), p('B', ['b', 'c'])], false, source)!;
      counts[(result.A + result.B) as keyof typeof counts]++;
    }
    expect(Object.values(counts).reduce((sum, n) => sum + (n - 4000) ** 2 / 4000, 0)).toBeLessThan(
      30,
    );
  });
  it('does not let duplicate candidate entries change probabilities', () => {
    const a = rng(7),
      b = rng(7);
    for (let i = 0; i < 100; i++)
      expect(drawOne(p('a', ['01', '01', '02']), false, a)).toBe(
        drawOne(p('a', ['01', '02']), false, b),
      );
  });
});

describe('bounded unbiased randomness', () => {
  it('rejects the overrepresented tail when converting 32-bit words into an index', () => {
    const words = [4294967295, 4294967294, 8];
    expect(randomBelow(3, () => words.shift()! / 4294967296)).toBe(2);
  });
  it('reports a calculation limit without substituting a biased matching', () => {
    const pool = Array.from({ length: 13 }, (_, i) => String(i));
    const ps = Array.from({ length: 13 }, (_, i) =>
      p(String(i), i === 0 ? pool.slice(0, -1) : pool),
    );
    expect(() => drawAll(ps, false, () => 0)).toThrow(LotteryCapacityError);
  });
});

import type { Player, Results } from '../models/types';
export type Random = () => number;
const UINT32_RANGE = 0x100000000;
export function random(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] / UINT32_RANGE;
}
/** Rejection removes the modulo/rounding bias of scaling a finite 32-bit source. */
export function randomBelow(bound: number, rng: Random = random): number {
  if (!Number.isSafeInteger(bound) || bound < 1 || bound > UINT32_RANGE)
    throw new RangeError('Invalid random bound');
  const limit = Math.floor(UINT32_RANGE / bound) * bound;
  let value: number;
  do value = Math.floor(rng() * UINT32_RANGE);
  while (value >= limit);
  return value % bound;
}
function randomBigInt(bound: bigint, rng: Random): bigint {
  if (bound === 1n) return 0n;
  const bits = (bound - 1n).toString(2).length;
  const words = Math.ceil(bits / 32);
  const mask = (1n << BigInt(bits)) - 1n;
  let value: bigint;
  do {
    value = 0n;
    for (let i = 0; i < words; i++)
      value = (value << 32n) | BigInt(Math.floor(rng() * UINT32_RANGE));
    value &= mask;
  } while (value >= bound);
  return value;
}
function shuffle<T>(items: readonly T[], rng: Random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomBelow(i + 1, rng);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
interface Pool {
  id: string;
  choices: string[];
}
/** Feasibility only. Never use its arbitrarily selected matching as a random result. */
function feasible(pools: Pool[]): boolean {
  const byId = new Map(pools.map((p) => [p.id, p.choices]));
  const owners = new Map<string, string>();
  function assign(id: string, seen: Set<string>): boolean {
    for (const fighter of byId.get(id)!) {
      if (seen.has(fighter)) continue;
      seen.add(fighter);
      const owner = owners.get(fighter);
      if (owner === undefined || assign(owner, seen)) {
        owners.set(fighter, id);
        return true;
      }
    }
    return false;
  }
  return pools.every((p) => assign(p.id, new Set()));
}
/** Disjoint candidate components are independent and can be sampled separately. */
function components(pools: Pool[]): Pool[][] {
  const groups: Pool[][] = [];
  const remaining = new Set(pools);
  while (remaining.size) {
    const first = remaining.values().next().value!;
    remaining.delete(first);
    const group = [first];
    const fighters = new Set(first.choices);
    for (let changed = true; changed;) {
      changed = false;
      for (const pool of remaining) {
        if (!pool.choices.some((f) => fighters.has(f))) continue;
        remaining.delete(pool);
        group.push(pool);
        pool.choices.forEach((f) => fighters.add(f));
        changed = true;
      }
    }
    groups.push(group);
  }
  return groups;
}
/** Exact integer completion counts: each full valid assignment gets probability 1 / total.
 * DP is O(fighters * players * 2^players); bounded to 12 players per connected component. */
function sampleCounted(pools: Pool[], rng: Random): Results {
  const ids = [...new Set(pools.flatMap((p) => p.choices))];
  const sets = pools.map((p) => new Set(p.choices));
  const eligible = ids.map((id) =>
    sets.reduce((mask, s, i) => (s.has(id) ? mask | (1 << i) : mask), 0),
  );
  const size = 1 << pools.length;
  const suffix: bigint[][] = Array.from({ length: ids.length + 1 }, () =>
    Array<bigint>(size).fill(0n),
  );
  suffix[ids.length][0] = 1n;
  for (let f = ids.length - 1; f >= 0; f--) {
    const next = suffix[f + 1],
      current = suffix[f];
    current[0] = 1n;
    for (let mask = 1; mask < size; mask++) {
      let count = next[mask];
      for (let bits = mask & eligible[f]; bits; bits &= bits - 1) {
        const bit = bits & -bits;
        count += next[mask ^ bit];
      }
      current[mask] = count;
    }
  }
  let mask = size - 1;
  const result: Results = {};
  for (let f = 0; mask && f < ids.length; f++) {
    let ticket = randomBigInt(suffix[f][mask], rng);
    const skip = suffix[f + 1][mask];
    if (ticket < skip) continue;
    ticket -= skip;
    for (let bits = mask & eligible[f]; bits; bits &= bits - 1) {
      const bit = bits & -bits;
      const completions = suffix[f + 1][mask ^ bit];
      if (ticket < completions) {
        result[pools[31 - Math.clz32(bit)].id] = ids[f];
        mask ^= bit;
        break;
      }
      ticket -= completions;
    }
  }
  return result;
}
export class LotteryCapacityError extends Error {
  constructor() {
    super(
      '公平な抽選の計算上限に達しました。参加人数を減らすか、候補キャラを増やして再度お試しください。',
    );
  }
}
function sampleComponent(pools: Pool[], rng: Random): Results {
  if (pools.length === 1) {
    const p = pools[0];
    return { [p.id]: p.choices[randomBelow(p.choices.length, rng)] };
  }
  const common = new Set(pools[0].choices);
  if (
    pools.every((p) => p.choices.length === common.size && p.choices.every((f) => common.has(f)))
  ) {
    const order = shuffle(pools[0].choices, rng);
    return Object.fromEntries(pools.map((p, i) => [p.id, order[i]]));
  }
  if (pools.length <= 12) return sampleCounted(pools, rng);
  // Uniform independent proposals conditioned on no collisions are also exactly uniform.
  // A finite rejection budget affects success rate only, never the distribution of accepted draws.
  // Do not fall back to a biased matching when the budget is exhausted.
  for (let attempt = 0; attempt < 4096; attempt++) {
    const used = new Set<string>();
    const result: Results = {};
    for (const p of pools) {
      const f = p.choices[randomBelow(p.choices.length, rng)];
      if (used.has(f)) break;
      used.add(f);
      result[p.id] = f;
    }
    if (used.size === pools.length) return result;
  }
  throw new LotteryCapacityError();
}
/** Uniform over all valid, distinct assignments after each player's previous-fighter exclusion.
 * This need not give equal marginal fighter probabilities when players have different pools. */
export function drawAll(
  players: readonly Player[],
  exclude: boolean,
  rng: Random = random,
): Results | null {
  const pools = players.map((p) => ({
    id: p.id,
    choices: [...new Set(p.candidates)].filter((id) => !exclude || id !== p.lastFighter),
  }));
  if (!feasible(pools)) return null;
  return Object.assign({}, ...components(pools).map((group) => sampleComponent(group, rng)));
}
export function drawOne(player: Player, exclude: boolean, rng: Random = random): string | null {
  // Other displayed players do not constrain this player's individual reroll.
  const available = [...new Set(player.candidates)].filter(
    (id) => !exclude || id !== player.lastFighter,
  );
  return available.length ? available[randomBelow(available.length, rng)] : null;
}

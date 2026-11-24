import { readFile, writeFile } from 'node:fs/promises';
import ts from 'typescript';
const code = ts.transpileModule(await readFile('src/services/lottery.ts', 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
}).outputText;
const { drawOne } = await import(
  'data:text/javascript;base64,' + Buffer.from(code).toString('base64')
);
// Exact occupancy probability for independent draws. Choose positions for each labelled fighter.
function exactOccupancy(category) {
  let dp = Array.from({ length: 51 }, () => [0n, 0n, 0n]);
  dp[0][0] = 1n;
  const choose = Array.from({ length: 51 }, () => Array(51).fill(0n));
  for (let n = 0; n <= 50; n++) {
    choose[n][0] = 1n;
    for (let c = 1; c <= n; c++) choose[n][c] = choose[n - 1][c - 1] + choose[n - 1][c];
  }
  for (let fighter = 0; fighter < 40; fighter++) {
    const next = Array.from({ length: 51 }, () => [0n, 0n, 0n]);
    for (let used = 0; used <= 50; used++)
      for (let h = 0; h <= 2; h++)
        if (dp[used][h])
          for (let c = 0; c <= 50 - used; c++) {
            next[used + c][Math.min(2, h + Number(category(c)))] +=
              dp[used][h] * choose[50 - used][c];
          }
    dp = next;
  }
  return Number(dp[50][2]) / Number(40n ** 50n);
}
// Reproducible statistical simulation only; production still uses Web Crypto.
// Mulberry32 provides the injectable source for the actual app drawOne path.
let seed = 0x715a40d3;
function rng() {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const trials = 200000;
const report = {
  assumptions: {
    fighters: 40,
    draws: 50,
    fixedPool: true,
    allDrawsCounted: true,
    noManualRerollsOmitted: true,
  },
  trials,
  simulationSeed: '0x715a40d3',
  exactIndependent: {
    atLeastTwoFightersEachAtLeastFive: exactOccupancy((c) => c >= 5),
    atLeastTwoFightersEachExactlyFive: exactOccupancy((c) => c === 5),
  },
  simulations: [],
};
const candidates = Array.from({ length: 40 }, (_, i) => String(i));
for (const exclude of [false, true]) {
  const player = { id: 'solo', candidates, lastFighter: null };
  let events = 0,
    exactFive = 0;
  const maxHistogram = {};
  for (let trial = 0; trial < trials; trial++) {
    const counts = Array(40).fill(0);
    player.lastFighter = null;
    for (let round = 0; round < 50; round++) {
      const f = drawOne(player, exclude, rng);
      if (f === null) throw new Error('Unexpected null');
      if (exclude && f === player.lastFighter) throw new Error('Previous fighter repeated');
      counts[Number(f)]++;
      player.lastFighter = f;
    }
    if (counts.filter((c) => c >= 5).length >= 2) events++;
    if (counts.filter((c) => c === 5).length >= 2) exactFive++;
    const max = Math.max(...counts);
    maxHistogram[max] = (maxHistogram[max] || 0) + 1;
  }
  const p = events / trials;
  report.simulations.push({
    excludePrevious: exclude,
    atLeastTwoFightersEachAtLeastFive: {
      events,
      probability: p,
      approx95PercentMonteCarloError: 1.96 * Math.sqrt((p * (1 - p)) / trials),
    },
    atLeastTwoFightersEachExactlyFive: { events: exactFive, probability: exactFive / trials },
    maxHistogram,
  });
}
report.createdAt = new Date().toISOString();
await writeFile('reports/repeat-frequency-audit.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import ts from 'typescript';
import { performance } from 'node:perf_hooks';
const src = await readFile('src/services/lottery.ts', 'utf8');
const js = ts.transpileModule(src, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
}).outputText;
const { drawAll, drawOne } = await import(
  'data:text/javascript;base64,' + Buffer.from(js).toString('base64')
);
const player = (id, candidates, lastFighter = null) => ({ id, candidates, lastFighter });
const candidates = Array.from({ length: 40 }, (_, i) => String(i));
const trials = 100000;
const single = Array(40).fill(0),
  solo = player('solo', candidates);
for (let i = 0; i < trials; i++) single[Number(drawOne(solo, false))]++;
const players = Array.from({ length: 4 }, (_, i) => player(String(i), candidates));
const shared = players.map(() => Array(40).fill(0));
for (let i = 0; i < trials; i++) {
  const result = drawAll(players, false);
  players.forEach((p, j) => shared[j][Number(result[p.id])]++);
}
const mixed = { ab: 0, ac: 0, bc: 0 };
for (let i = 0; i < 60000; i++) {
  const r = drawAll([player('A', ['a', 'b']), player('B', ['b', 'c'])], false);
  mixed[r.A + r.B]++;
}
const timings = [];
const ten = Array.from({ length: 10 }, (_, i) => player(String(i), candidates, String(i)));
for (let i = 0; i < 20; i++) {
  const before = performance.now();
  drawAll(ten, true);
  timings.push(performance.now() - before);
}
function summary(counts, n) {
  const expected = n / counts.length;
  return {
    counts,
    min: Math.min(...counts),
    max: Math.max(...counts),
    expected,
    chiSquared: counts.reduce((s, v) => s + (v - expected) ** 2 / expected, 0),
    degreesOfFreedom: counts.length - 1,
  };
}
const stats = [summary(single, trials), ...shared.map((row) => summary(row, trials))];
const report = {
  date: new Date().toISOString(),
  randomSource: 'Web Crypto getRandomValues; integer rejection sampling',
  trials,
  single40: stats[0],
  fourShared40: stats.slice(1),
  asymmetricThreeAssignments: {
    trials: 60000,
    ...summary(Object.values(mixed), 60000),
    outcomes: mixed,
  },
  tenPlayers40ExcludePreviousTimingMs: {
    median: [...timings].sort((a, b) => a - b)[10],
    max: Math.max(...timings),
  },
  repeatExplanation: {
    single40RepeatOnNextDraw: 0.025,
    anyRepeatWithin10Draws:
      1 - Array.from({ length: 10 }, (_, i) => (40 - i) / 40).reduce((a, b) => a * b, 1),
    expectedUniqueAfter40Draws: 40 * (1 - (39 / 40) ** 40),
  },
  passed:
    stats.every((s) => s.chiSquared < 100) && summary(Object.values(mixed), 60000).chiSquared < 30,
};
await mkdir('reports', { recursive: true });
await writeFile('reports/randomness-audit.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (!report.passed) process.exitCode = 1;

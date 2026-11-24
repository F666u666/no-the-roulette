import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import ts from 'typescript';
const loadTs = async (file) => {
  const source = await readFile(file, 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
  }).outputText;
  return import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
};
const { drawAll } = await loadTs('src/services/lottery.ts');
const { fighters } = await loadTs('src/data/fighters.ts');
const roster = fighters.slice(0, 40),
  candidates = roster.map((f) => f.id),
  index = new Map(candidates.map((id, i) => [id, i]));
const sets = 100,
  draws = 10000,
  expected = draws / 40;
const started = performance.now(),
  totals = Array(40).fill(0),
  batches = [];
let totalWindows = 0,
  repeatedWindows = 0,
  previousViolations = 0;
for (let set = 1; set <= sets; set++) {
  const player = { id: 'simulation', candidates, lastFighter: null };
  const counts = Array(40).fill(0);
  let window = Array(40).fill(0),
    localWindows = 0;
  for (let draw = 0; draw < draws; draw++) {
    // No injected RNG: call the same one-player START path and Web Crypto as production.
    const next = drawAll([player], true)?.[player.id];
    if (!index.has(next)) throw new Error('Result outside the candidate set');
    if (next === player.lastFighter) previousViolations++;
    const i = index.get(next);
    counts[i]++;
    totals[i]++;
    window[i]++;
    player.lastFighter = next;
    if ((draw + 1) % 50 === 0) {
      totalWindows++;
      if (window.filter((c) => c >= 5).length >= 2) {
        repeatedWindows++;
        localWindows++;
      }
      window = Array(40).fill(0);
    }
  }
  batches.push({
    set,
    counts,
    min: Math.min(...counts),
    max: Math.max(...counts),
    fiftyDrawWindowsWithTwoTypesAtLeastFive: localWindows,
  });
  if (set % 10 === 0) console.log(`${set}/100 sets completed`);
}
if (previousViolations) throw new Error('Previous-fighter exclusion failed');
const minBatch = batches.reduce((a, b) => (b.min < a.min ? b : a)),
  maxBatch = batches.reduce((a, b) => (b.max > a.max ? b : a));
const report = {
  createdAt: new Date().toISOString(),
  settings: {
    sets,
    drawsPerSet: draws,
    totalDraws: sets * draws,
    fighters: 40,
    excludePrevious: true,
    resetPreviousAtSetStart: true,
    randomSource: 'Unmodified production Web Crypto getRandomValues; no injected RNG',
    path: 'drawAll([player], true), same as one-player START',
    candidateSelection: 'First 40 entries in official roster order; labels do not affect sampling',
  },
  lotterySourceSha256: createHash('sha256')
    .update(await readFile('src/services/lottery.ts'))
    .digest('hex'),
  summary: {
    expectedPerFighterPerSet: expected,
    expectedPerFighterOverall: sets * expected,
    overallMin: Math.min(...totals),
    overallMax: Math.max(...totals),
    overallMinPercent: (Math.min(...totals) / (sets * draws)) * 100,
    overallMaxPercent: (Math.max(...totals) / (sets * draws)) * 100,
    smallestSingleSetCount: { set: minBatch.set, count: minBatch.min },
    largestSingleSetCount: { set: maxBatch.set, count: maxBatch.max },
    previousFighterViolations: previousViolations,
    fiftyDrawWindows: {
      total: totalWindows,
      twoTypesEachAtLeastFive: repeatedWindows,
      percent: (repeatedWindows / totalWindows) * 100,
    },
    elapsedSeconds: (performance.now() - started) / 1000,
  },
  fighters: roster.map((f, i) => ({
    id: f.id,
    name: f.name,
    english: f.english,
    total: totals[i],
    percent: (totals[i] / (sets * draws)) * 100,
    lowestSet: Math.min(...batches.map((b) => b.counts[i])),
    highestSet: Math.max(...batches.map((b) => b.counts[i])),
  })),
  batches,
};
await mkdir('reports', { recursive: true });
await writeFile('reports/million-draw-audit.json', JSON.stringify(report, null, 2) + '\n');
const csv = [
  'set,' + roster.map((f) => f.name).join(',') + ',min,max',
  ...batches.map((b) => [b.set, ...b.counts, b.min, b.max].join(',')),
  'TOTAL,' + totals.join(',') + ',' + Math.min(...totals) + ',' + Math.max(...totals),
].join('\n');
await writeFile('reports/million-draw-counts.csv', '\ufeff' + csv + '\n');
console.log(JSON.stringify(report.summary, null, 2));
console.log(JSON.stringify(report.fighters, null, 2));

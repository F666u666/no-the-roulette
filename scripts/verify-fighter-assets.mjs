import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import sharp from 'sharp';
import { expandRoster, ROSTER_URL } from './fighter-roster.mjs';
const root = process.argv.includes('--dist') ? 'dist' : 'public';
const sha = (b) => createHash('sha256').update(b).digest('hex');
const sourceBytes = await readFile('sources/smashbros-fighters.json');
const official = JSON.parse(sourceBytes);
const expected = expandRoster(official);
const provenance = JSON.parse(await readFile('sources/fighter-assets.json', 'utf8'));
const source = await readFile('src/data/fighters.ts', 'utf8');
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { fighters } = await import(
  'data:text/javascript;base64,' + Buffer.from(javascript).toString('base64')
);
const missing = [],
  mismatched = [],
  verified = [],
  seenHashes = new Set();
if (provenance.rosterSha256 !== sha(sourceBytes))
  mismatched.push('Official roster snapshot checksum changed');
for (const f of expected) {
  const registered = fighters.find((r) => r.id === f.id);
  const trace = provenance.entries.find((r) => r.id === f.id);
  if (!registered || !trace) {
    missing.push({ id: f.id, name: f.name, reason: 'Not registered or no source provenance' });
    continue;
  }
  if (
    registered.order !== f.order ||
    registered.name !== f.name ||
    registered.english !== f.english ||
    registered.imagePath !== f.imagePath ||
    registered.portraitPath !== f.portraitPath
  )
    mismatched.push(`${f.name}: roster metadata mismatch`);
  for (const variant of ['imagePath', 'portraitPath']) {
    try {
      const b = await readFile(root + registered[variant]);
      const meta = await sharp(b).metadata();
      const stats = await sharp(b).stats();
      const actualHash = sha(b);
      if (
        meta.format !== 'webp' ||
        meta.width < 80 ||
        meta.height < 80 ||
        !stats.channels.some((c) => c.max > 0)
      )
        throw new Error('Undecodable/empty or incorrect image format');
      if (actualHash !== trace[variant === 'imagePath' ? 'sha256' : 'portraitSha256'])
        throw new Error('Asset differs from verified acquired artwork');
      if (variant === 'imagePath') {
        if (seenHashes.has(actualHash))
          throw new Error('Duplicate artwork assigned to different fighters');
        seenHashes.add(actualHash);
      }
      verified.push(registered[variant]);
    } catch (e) {
      missing.push({ id: f.id, name: f.name, path: registered[variant], reason: String(e) });
    }
  }
}
if (
  fighters.length !== expected.length ||
  new Set(fighters.map((f) => f.id)).size !== expected.length
)
  mismatched.push('Registered roster contains duplicate, missing or extra fighters');
const files = (await readdir(root + '/fighters')).filter((f) => f.endsWith('.webp'));
if (files.length !== 89) mismatched.push(`Expected 89 fighter images, found ${files.length}`);
let cachedImages = null;
if (root === 'dist') {
  const sw = await readFile('dist/sw.js', 'utf8');
  const list = JSON.parse(sw.match(/const PRECACHE=(\[[^;]+\]);/)[1]);
  cachedImages = verified.filter((file) => list.includes(file)).length;
  for (const file of verified) if (!list.includes(file)) mismatched.push(`Not precached: ${file}`);
  if (list.some((file) => file.startsWith('/assets/fighters/')))
    mismatched.push('Old placeholder images remain in precache');
}
await mkdir('reports', { recursive: true });
const report = {
  verifiedAt: new Date().toISOString(),
  rosterSource: ROSTER_URL,
  rosterSha256: sha(sourceBytes),
  officialGroupedEntries: official.fighters.length,
  expectedIndividualFighters: expected.length,
  registeredFighters: fighters.length,
  fullImageFiles: files.length,
  validatedImages: verified.length,
  cachedImages,
  officialHostImages: provenance.entries.filter(
    (e) => new URL(e.sourceImageUrl).hostname === 'www.smashbros.com',
  ).length,
  officialArtworkMirrorImages: provenance.entries.filter(
    (e) => new URL(e.sourceImageUrl).hostname === 'www.ssbwiki.com',
  ).length,
  missingCount: missing.length,
  mismatched,
  missing,
  passed: missing.length === 0 && mismatched.length === 0,
};
await writeFile(
  `reports/fighter-assets-audit${root === 'dist' ? '-build' : ''}.json`,
  JSON.stringify(report, null, 2) + '\n',
);
await writeFile(
  'reports/missing-fighter-assets.json',
  JSON.stringify({ count: missing.length, missing }, null, 2) + '\n',
);
console.log(JSON.stringify(report, null, 2));
if (!report.passed) process.exitCode = 1;

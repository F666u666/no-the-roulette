import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import sharp from 'sharp';
import { expandRoster, ROSTER_URL } from './fighter-roster.mjs';
const CACHE = 'work/fighter-source-cache';
// Measured face regions in alpha-trimmed official artwork (x, y, width, height).
const faceCrops = {
  33: [0.04, 0, 0.65, 0.43],
  34: [0.22, 0.35, 0.64, 0.48],
  35: [0.2, 0.1, 0.54, 0.45],
  51: [0.34, 0, 0.6, 0.39],
  52: [0.13, 0, 0.56, 0.4],
  53: [0.32, 0, 0.58, 0.41],
  79: [0.39, 0, 0.38, 0.32],
  80: [0.14, 0, 0.43, 0.33],
};
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const allowed = new Set(['www.smashbros.com', 'www.ssbwiki.com']);
for (const dir of [CACHE, 'sources', 'reports', 'public/fighters/portraits'])
  await mkdir(dir, { recursive: true });
async function download(url, cache = true) {
  if (!allowed.has(new URL(url).hostname)) throw new Error(`Unapproved asset host: ${url}`);
  const file = path.join(CACHE, sha(url));
  if (cache) {
    try {
      return await readFile(file);
    } catch {
      /* first acquisition */
    }
  }
  let last;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(45000),
        headers: { 'User-Agent': 'NoTheRoulette-AssetImporter/1.0' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
      if (!allowed.has(new URL(res.url).hostname)) throw new Error('Unexpected redirect');
      const bytes = Buffer.from(await res.arrayBuffer());
      await writeFile(file, bytes);
      return bytes;
    } catch (e) {
      last = e;
    }
  }
  throw last;
}
const raw = await download(ROSTER_URL, false);
const source = JSON.parse(raw.toString());
const roster = expandRoster(source);
await writeFile('sources/smashbros-fighters.json', raw);
const failures = [],
  entries = [];
let next = 0;
async function acquire(f) {
  let imageUrl, portraitUrl, artworkPage;
  if (f.wiki) {
    artworkPage = `https://www.ssbwiki.com/File:${f.wiki}`;
    const page = (await download(artworkPage)).toString();
    const media = page.match(/class="mw-content-ltr fullMedia"[\s\S]*?<a href="([^"]+)"/);
    if (!media) throw new Error('Original-file link missing on artwork page');
    imageUrl = media[1].replaceAll('&amp;', '&');
  } else {
    artworkPage = f.sourcePage;
    const page = (await download(f.sourcePage)).toString();
    const match = page.match(/data-src="([^"\s]+\/main\.png)"/);
    if (!match) throw new Error('Official character main.png not present on detail page');
    imageUrl = new URL(match[1], 'https://www.smashbros.com').href;
    portraitUrl = `https://www.smashbros.com/assets_v2/img/fighter/thumb_a/${f.file}.png`;
  }
  const original = await download(imageUrl);
  const originalMeta = await sharp(original).metadata();
  if (originalMeta.format !== 'png' || originalMeta.width < 100 || originalMeta.height < 100)
    throw new Error('Invalid official artwork PNG');
  const full = await sharp(original)
    .trim({ threshold: 5 })
    .resize({ width: 1000, height: 1100, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 88, effort: 5 })
    .toBuffer();
  let portrait, portraitOriginal;
  if (portraitUrl) {
    portraitOriginal = await download(portraitUrl);
    portrait = await sharp(portraitOriginal)
      .resize({ width: 420, height: 280, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 91, effort: 5 })
      .toBuffer();
  } else {
    portraitOriginal = original;
    const trimmed = await sharp(original).trim({ threshold: 5 }).png().toBuffer();
    const meta = await sharp(trimmed).metadata();
    const [x, y, w, h] = faceCrops[f.id];
    portrait = await sharp(trimmed)
      .extract({
        left: Math.floor(x * meta.width),
        top: Math.floor(y * meta.height),
        width: Math.floor(w * meta.width),
        height: Math.floor(h * meta.height),
      })
      .resize(420, 300, { fit: 'cover', position: 'centre' })
      .webp({ quality: 90, effort: 5 })
      .toBuffer();
  }
  await writeFile('public' + f.imagePath, full);
  await writeFile('public' + f.portraitPath, portrait);
  entries.push({
    id: f.id,
    name: f.name,
    english: f.english,
    order: f.order,
    officialEntryId: f.officialEntryId,
    officialRosterPage: f.sourcePage,
    imagePath: f.imagePath,
    portraitPath: f.portraitPath,
    artworkPage,
    sourceImageUrl: imageUrl,
    sourcePortraitUrl: portraitUrl ?? imageUrl,
    hostedBy: f.wiki
      ? 'SmashWiki (individual official artwork mirror)'
      : 'Nintendo / smashbros.com',
    sourceSha256: sha(original),
    sourcePortraitSha256: sha(portraitOriginal),
    sha256: sha(full),
    portraitSha256: sha(portrait),
    width: originalMeta.width,
    height: originalMeta.height,
    bytes: full.length,
    portraitBytes: portrait.length,
    processing: f.wiki
      ? 'Alpha trim, WebP encoding, measured face crop for portrait; no generated pixels'
      : 'Alpha trim, resize and WebP encoding; official portrait used without generated pixels',
  });
  console.log(`${f.id} ${f.name} ✓ ${Math.round(full.length / 1024)} KB`);
}
await Promise.all(
  Array.from({ length: 4 }, async () => {
    while (next < roster.length) {
      const f = roster[next++];
      try {
        await acquire(f);
      } catch (e) {
        const failure = { id: f.id, name: f.name, reason: String(e) };
        failures.push(failure);
        console.error('MISSING', f.name, String(e));
      }
    }
  }),
);
entries.sort((a, b) => a.order - b.order);
await writeFile(
  'reports/missing-fighter-assets.json',
  JSON.stringify({ missing: failures, count: failures.length }, null, 2) + '\n',
);
await writeFile(
  'sources/fighter-assets.json',
  JSON.stringify(
    {
      retrievedAt: new Date().toISOString(),
      rosterUrl: ROSTER_URL,
      rosterSha256: sha(raw),
      officialEntryCount: source.fighters.length,
      expandedFighterCount: roster.length,
      entries,
    },
    null,
    2,
  ) + '\n',
);
if (failures.length) {
  console.error('missing-fighter-assets:', failures);
  process.exitCode = 1;
} else {
  const data = roster.map((f) => ({
    id: f.id,
    name: f.name,
    english: f.english,
    number: f.number,
    order: f.order,
    imagePath: f.imagePath,
    portraitPath: f.portraitPath,
    series: f.series,
  }));
  await writeFile(
    'src/data/fighters.ts',
    `// Generated by npm run assets:sync from the official final roster. Keep numeric IDs for existing saves.\nimport type { Fighter } from '../models/types';\nexport const fighters: Fighter[] = ${JSON.stringify(data, null, 2)};\nexport const fighterById = Object.fromEntries(fighters.map(f=>[f.id,f]));\n`,
  );
  console.log(`Complete: ${entries.length}/${roster.length} fighters; missing-fighter-assets: 0`);
}

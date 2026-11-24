import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';

const mime = {
  '.png': 'image/png', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.webp': 'image/webp', '.ttf': 'font/ttf', '.wav': 'audio/wav',
};

async function inlineAssets(directory) {
  const entries = await readdir(join('public', directory), { withFileTypes: true });
  const lists = await Promise.all(entries.map(async (entry) => {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) return inlineAssets(path);
    const contentType = mime[extname(path)];
    if (!contentType) return [];
    const bytes = await readFile(join('public', path));
    return [[`/${path}`, `data:${contentType};base64,${bytes.toString('base64')}`]];
  }));
  return lists.flat();
}

const files = Object.fromEntries((await Promise.all(
  ['assets', 'fighters', 'fonts'].map(inlineAssets)
)).flat());
const index = await readFile('dist/index.html', 'utf8');
const moduleTag = /<script type="module"[^>]* src="(\/assets\/[^"]+\.js)"><\/script>/;
const styleTag = /<link rel="stylesheet"[^>]* href="(\/assets\/[^"]+\.css)">/;
const modulePath = index.match(moduleTag)?.[1];
const stylePath = index.match(styleTag)?.[1];
if (!modulePath || !stylePath) throw new Error('Build the app before exporting standalone HTML.');

const js = await readFile('dist' + modulePath, 'utf8');
const css = (await readFile('dist' + stylePath, 'utf8')).replace(
  /url\((['"]?)(\/[^)'"]+)\1\)/g,
  (match, _quote, path) => files[path] ? `url("${files[path]}")` : match,
);
const html = index
  .replace(/\s*<link rel="manifest"[^>]*>/, '')
  .replace(/href="(\/assets\/icons\/[^"]+)"/g, (match, path) =>
    files[path] ? `href="${files[path]}"` : match)
  .replace(styleTag, () => `<style>${css}</style>`)
  .replace(moduleTag, () =>
    `<script>window.__rouletteFiles=${JSON.stringify(files)};</script><script type="module">${js.replace(/<\/script/gi, '<\\/script')}</script>`);
const output = process.argv[2] ?? 'work/standalone/脳THEルーレット.html';
await mkdir(dirname(output), { recursive: true });
await writeFile(output, html);
console.log(`Wrote ${output} with ${Object.keys(files).length} embedded assets`);

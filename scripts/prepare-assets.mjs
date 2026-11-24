import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const index = { players: {} };
for (const type of ['players']) {
  const files = await readdir(`public/assets/${type}`);
  // Raster replacements take priority over bundled SVG placeholders.
  for (const ext of ['.svg', '.png', '.jpg', '.jpeg', '.webp', '.avif'])
    for (const file of files.filter((f) => path.extname(f).toLowerCase() === ext))
      index[type][path.basename(file, path.extname(file))] = `/assets/${type}/${file}`;
}
await writeFile('src/data/asset-index.json', JSON.stringify(index, null, 2) + '\n');

import sharp from 'sharp';
for (const [file, size] of [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['icon-maskable.png', 512],
  ['apple-touch-icon.png', 180],
])
  await sharp('public/assets/icons/source.svg')
    .resize(size)
    .png()
    .toFile(`public/assets/icons/${file}`);

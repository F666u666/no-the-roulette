/** Expand the official site's grouped entries, preserving its order and existing save IDs. */
export const ROSTER_URL = 'https://www.smashbros.com/assets_v2/data/fighter.json';
const groups = {
  '33-35': [
    {
      id: '33',
      name: 'ゼニガメ',
      english: 'Squirtle',
      slug: 'squirtle',
      wiki: 'Squirtle_SSBU.png',
    },
    { id: '34', name: 'フシギソウ', english: 'Ivysaur', slug: 'ivysaur', wiki: 'Ivysaur_SSBU.png' },
    {
      id: '35',
      name: 'リザードン',
      english: 'Charizard',
      slug: 'charizard',
      wiki: 'Charizard_SSBU.png',
    },
  ],
  '51-53': [
    {
      id: '51',
      name: 'Mii 格闘タイプ',
      english: 'Mii Brawler',
      slug: 'mii-brawler',
      wiki: 'Mii_Brawler_SSBU.png',
    },
    {
      id: '52',
      name: 'Mii 剣術タイプ',
      english: 'Mii Swordfighter',
      slug: 'mii-swordfighter',
      wiki: 'Mii_Swordfighter_SSBU.png',
    },
    {
      id: '53',
      name: 'Mii 射撃タイプ',
      english: 'Mii Gunner',
      slug: 'mii-gunner',
      wiki: 'Mii_Gunner_SSBU.png',
    },
  ],
  '79-80': [
    { id: '79', name: 'ホムラ', english: 'Pyra', slug: 'pyra', wiki: 'Pyra_SSBU.png' },
    { id: '80', name: 'ヒカリ', english: 'Mythra', slug: 'mythra', wiki: 'Mythra_SSBU.png' },
  ],
};
const clean = (value) =>
  value
    .replace(/<[^>]+>/g, '')
    .replaceAll('&amp;', '&')
    .trim();
const slugify = (value) =>
  value
    .toLowerCase()
    .replaceAll('&', ' and ')
    .replaceAll('.', '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
export function expandRoster(data) {
  if (!Array.isArray(data.fighters)) throw new Error('Invalid official roster');
  const expanded = data.fighters
    .flatMap((entry, officialIndex) => {
      const common = {
        officialEntryId: entry.id,
        officialIndex,
        sourcePage: `https://www.smashbros.com/ja_JP/fighter/${entry.url}.html`,
        file: entry.file,
        series: entry.series,
        dlc: entry.dlc === 1,
      };
      if (groups[entry.url]) return groups[entry.url].map((f) => ({ ...common, ...f }));
      const english = clean(entry.displayName.en_US);
      return [
        {
          ...common,
          id: entry.url,
          name: clean(entry.displayNameJa),
          english,
          slug: entry.url === '77' ? 'steve' : slugify(english),
        },
      ];
    })
    .map((f, order) => ({
      ...f,
      order,
      number: f.id.replace('e', 'ᵋ'),
      imagePath: `/fighters/${f.slug}.webp`,
      portraitPath: `/fighters/portraits/${f.slug}.webp`,
    }));
  const expected = new Set([
    ...Array.from({ length: 82 }, (_, i) => String(i + 1).padStart(2, '0')),
    ...['04', '13', '21', '25', '28', '60', '66'].map((id) => id + 'e'),
  ]);
  const actual = new Set(expanded.map((f) => f.id));
  if (
    data.fighters.length !== 84 ||
    expanded.length !== 89 ||
    actual.size !== 89 ||
    [...expected].some((id) => !actual.has(id)) ||
    expanded.at(-1).id !== '82'
  )
    throw new Error(
      'Official final roster does not match the expected 89 numbered fighters; manual review required.',
    );
  return expanded;
}

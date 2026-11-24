export function hashName(name: string): number {
  let hash = 2166136261;
  for (const char of name.normalize('NFC')) {
    hash ^= char.codePointAt(0)!;
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
const colors = [
  '#c6f45b',
  '#66dbef',
  '#fa9b71',
  '#b59aff',
  '#ff83b3',
  '#f7d568',
  '#68e5b0',
  '#79aaff',
  '#e8a2ed',
  '#d4de80',
  '#f99191',
  '#76d1bd',
];
export const colorForName = (name: string) => colors[hashName(name) % colors.length];
export const iconForName = (name: string) => hashName(name) % 12;

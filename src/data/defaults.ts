import { fighters } from './fighters';
import { colorForName, iconForName } from '../utils/identity';
import type { AppData, Player } from '../models/types';
export const initialNames = [
  'いっさ',
  'ジェン',
  'NO6',
  'おろしポンズ',
  'HERO',
  'うろたんげだまや',
  'ゴッホ',
  'かば',
  'ハリソン',
  'はかせ',
];
export function createPlayer(name: string, id: string = crypto.randomUUID()): Player {
  return {
    id,
    name,
    color: colorForName(name),
    icon: iconForName(name),
    candidates: [],
    lastFighter: null,
  };
}
export function defaultData(): AppData {
  return {
    version: 1,
    drawHistory: [],
    players: initialNames.map((name, i) => ({
      ...createPlayer(name, `initial-${i + 1}`),
      candidates: fighters.map((f) => f.id),
    })),
    selected: [],
    excludePrevious: true,
    sound: true,
    editingPlayer: null,
  };
}

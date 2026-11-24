export interface Fighter {
  id: string;
  name: string;
  english: string;
  number: string;
  order: number;
  imagePath: string;
  portraitPath: string;
  series: string;
}
export interface Player {
  id: string;
  name: string;
  color: string;
  icon: number;
  candidates: string[];
  lastFighter: string | null;
}
export type MatchOutcome = 'win' | 'loss' | null;
export interface MatchBonus {
  version: 1;
  threeStocks: boolean;
  eightStocks: boolean;
  selfDestruct?: boolean;
  kills: 'none' | 'eight' | 'restricted-eight' | 'ten' | 'twelve' | 'six-each' | 'three-each';
}
export interface DrawRecord {
  id: string;
  playerId: string;
  playerName: string;
  fighterId: string;
  at: number;
  candidates: string[];
  excludePrevious: boolean;
  previousFighter: string | null;
  kind: 'draw' | 'reroll';
  outcome: MatchOutcome;
  bonus?: MatchBonus;
}
export interface AppData {
  version: 1;
  players: Player[];
  selected: string[];
  excludePrevious: boolean;
  sound: boolean;
  editingPlayer: string | null;
  drawHistory: DrawRecord[];
}
export type Results = Record<string, string>;
export type Screen =
  | { kind: 'members' }
  | { kind: 'results' }
  | { kind: 'settings' }
  | { kind: 'history-list' }
  | { kind: 'detail'; id: string }
  | { kind: 'editor'; id: string }
  | { kind: 'history'; id: string };

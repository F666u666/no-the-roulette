import type { AppData, Player } from '../models/types';
import { fighters } from '../data/fighters';
import { createPlayer } from '../data/defaults';

export interface SharedPlayer {
  name: string;
  candidates: string[];
}
const fighterIds = new Set(fighters.map((f) => f.id));
const invalid = () =>
  new Error('共有リンクを読み込めません。送り主にリンクを作り直してもらってください。');

function validate(value: unknown): SharedPlayer {
  if (!value || typeof value !== 'object') throw invalid();
  const p = value as Record<string, unknown>;
  if (
    typeof p.name !== 'string' ||
    !p.name.trim() ||
    p.name.length > 24 ||
    Array.from(p.name).some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)
  )
    throw invalid();
  if (
    !Array.isArray(p.candidates) ||
    !p.candidates.length ||
    p.candidates.length > fighters.length ||
    p.candidates.some((id) => typeof id !== 'string' || !fighterIds.has(id)) ||
    new Set(p.candidates).size !== p.candidates.length
  )
    throw invalid();
  return { name: p.name.trim(), candidates: [...p.candidates] as string[] };
}

/** The fragment stays on the receiving device; no server or account is needed. */
export function createPlayerLink(player: Player, baseUrl: string): string {
  const p = validate(player);
  const bytes = new TextEncoder().encode(JSON.stringify({ app: 'no-the-roulette', v: 1, ...p }));
  const token = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  const url = new URL(baseUrl);
  url.search = '';
  url.hash = `player=${token}`;
  return url.href;
}

export function readPlayerHash(hash: string): SharedPlayer | null {
  if (!hash.startsWith('#player=')) return null;
  const token = hash.slice(8);
  if (!token || token.length > 2048 || !/^[A-Za-z0-9_-]+$/.test(token)) throw invalid();
  try {
    const raw = atob(token.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(
        Uint8Array.from(raw, (c) => c.charCodeAt(0)),
      ),
    );
    if (payload.app !== 'no-the-roulette' || payload.v !== 1) throw invalid();
    return validate(payload);
  } catch {
    throw invalid();
  }
}

export function readPlayerLink(text: string): SharedPlayer {
  try {
    const url = new URL(text.trim());
    if (!['http:', 'https:'].includes(url.protocol)) throw invalid();
    const player = readPlayerHash(url.hash);
    if (!player) throw invalid();
    return player;
  } catch {
    throw invalid();
  }
}

/** Only an exact, unambiguous name match is suggested. Never guess from array positions. */
export function suggestedTarget(players: Player[], shared: SharedPlayer): string {
  const matches = players.filter((p) => p.name === shared.name);
  return matches.length === 1 ? matches[0].id : '';
}

export function importPlayer(
  data: AppData,
  shared: SharedPlayer,
  targetId: string | null,
): { data: AppData; playerId: string } {
  const p = validate(shared);
  if (targetId !== null) {
    if (!data.players.some((player) => player.id === targetId))
      throw new Error('上書きするプレイヤーを選び直してください。');
    return {
      playerId: targetId,
      data: {
        ...data,
        editingPlayer: data.editingPlayer === targetId ? null : data.editingPlayer,
        players: data.players.map((player) =>
          player.id === targetId ? { ...player, ...p } : player,
        ),
      },
    };
  }
  const added = { ...createPlayer(p.name), candidates: p.candidates };
  return { playerId: added.id, data: { ...data, players: [...data.players, added] } };
}

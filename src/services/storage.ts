import type { AppData, Player, DrawRecord } from '../models/types';
import { fighters } from '../data/fighters';
import { defaultData } from '../data/defaults';
import { validBonus } from './drawHistory';
const DB = 'no-the-roulette';
const STORE = 'app';
let connection: Promise<IDBDatabase> | undefined;
function open(): Promise<IDBDatabase> {
  if (!connection)
    connection = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => {
        const db = req.result;
        db.onversionchange = () => {
          db.close();
          connection = undefined;
        };
        resolve(db);
      };
      req.onerror = () => {
        connection = undefined;
        reject(req.error);
      };
      req.onblocked = () => {
        connection = undefined;
        reject(new Error('他のタブを閉じて再試行してください。'));
      };
    });
  return connection;
}
/** Explicit version gate: never silently overwrite unknown/corrupt data. */
export function migrate(value: unknown): AppData {
  if (!value || typeof value !== 'object') throw new Error('保存データを読み込めません。');
  const d = value as AppData;
  const ids = new Set(fighters.map((f) => f.id));
  if (d.version !== 1) throw new Error('この保存データには新しいアプリが必要です。');
  if (
    !Array.isArray(d.players) ||
    !Array.isArray(d.selected) ||
    typeof d.excludePrevious !== 'boolean' ||
    typeof d.sound !== 'boolean'
  )
    throw new Error('保存データの形式を確認できません。');
  const playerIds = new Set<string>();
  for (const p of d.players as Player[]) {
    if (
      !p ||
      typeof p.id !== 'string' ||
      playerIds.has(p.id) ||
      typeof p.name !== 'string' ||
      !p.name.trim() ||
      typeof p.color !== 'string' ||
      !/^#[0-9a-f]{6}$/i.test(p.color) ||
      !Number.isInteger(p.icon) ||
      p.icon < 0 ||
      p.icon > 11 ||
      !Array.isArray(p.candidates) ||
      p.candidates.some((id) => !ids.has(id)) ||
      (p.lastFighter !== null && !ids.has(p.lastFighter))
    )
      throw new Error('保存されたプレイヤー情報を読み込めません。');
    playerIds.add(p.id);
  }
  const drawHistory: DrawRecord[] = d.drawHistory === undefined ? [] : d.drawHistory;
  if (!Array.isArray(drawHistory)) throw new Error('抽選履歴の形式を確認できません。');
  const recordIds = new Set<string>();
  for (const r of drawHistory) {
    if (
      !r ||
      typeof r.id !== 'string' ||
      !r.id ||
      recordIds.has(r.id) ||
      typeof r.playerId !== 'string' ||
      typeof r.playerName !== 'string' ||
      !r.playerName.trim() ||
      !ids.has(r.fighterId) ||
      !Number.isSafeInteger(r.at) ||
      r.at < 0 ||
      r.at > 8640000000000000 - 86400000 ||
      !Array.isArray(r.candidates) ||
      !r.candidates.length ||
      r.candidates.some((id) => !ids.has(id)) ||
      new Set(r.candidates).size !== r.candidates.length ||
      !r.candidates.includes(r.fighterId) ||
      typeof r.excludePrevious !== 'boolean' ||
      (r.previousFighter !== null && !ids.has(r.previousFighter)) ||
      !['draw', 'reroll'].includes(r.kind) ||
      ![null, 'win', 'loss'].includes(r.outcome) ||
      (r.bonus !== undefined && !validBonus(r.bonus))
    )
      throw new Error('保存された抽選履歴を読み込めません。');
    recordIds.add(r.id);
  }
  return {
    ...d,
    drawHistory,
    selected: [...new Set(d.selected.filter((id) => playerIds.has(id)))],
    editingPlayer:
      typeof d.editingPlayer === 'string' && playerIds.has(d.editingPlayer)
        ? d.editingPlayer
        : null,
  };
}
export async function loadData(): Promise<AppData> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE).objectStore(STORE).get('state');
    req.onsuccess = () => {
      try {
        resolve(req.result === undefined ? defaultData() : migrate(req.result));
      } catch (e) {
        reject(e);
      }
    };
    req.onerror = () => reject(req.error);
  });
}
export async function saveData(data: AppData): Promise<void> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(data, 'state');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('保存が中断されました。'));
  });
}

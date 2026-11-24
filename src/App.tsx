import { useEffect, useRef, useState } from 'react';
import { X } from '@phosphor-icons/react';
import { useReducedMotion } from 'motion/react';
import { DRAW_REVEAL_MS, DrawSequence } from './components/DrawSequence';
import type {
  AppData,
  Results as ResultMap,
  Screen,
  MatchOutcome,
  MatchBonus,
} from './models/types';
import { useStore } from './hooks/useStore';
import { createPlayer } from './data/defaults';
import { fighters } from './data/fighters';
import { drawAll, drawOne, LotteryCapacityError } from './services/lottery';
import { playSound } from './services/audio';
import { registerPwa, activateUpdate } from './services/pwa';
import type { PwaStatus } from './services/pwa';
import { Dialog, DoneFlash } from './components/Primitives';
import { NameDialog } from './components/NameDialog';
import { Members } from './screens/Members';
import { Results } from './screens/Results';
import { Settings } from './screens/Settings';
import { Detail } from './screens/Detail';
import { Editor } from './screens/Editor';
import { History } from './screens/History';
import { HistoryHome } from './screens/HistoryHome';
import { MatchRecordDialog } from './components/MatchRecord';
import { useGameDay } from './hooks/useGameDay';
import {
  createDrawRecords,
  setRecordOutcome,
  setRecordBonus,
  applyMatchToPlayers,
} from './services/drawHistory';
import {
  SharePlayerDialog,
  ReadPlayerLinkDialog,
  ImportPlayerDialog,
} from './components/PlayerSharing';
import { readPlayerHash, importPlayer } from './services/playerShare';
import type { SharedPlayer } from './services/playerShare';
type IncomingPlayer =
  { shared: SharedPlayer; error?: never } | { shared?: never; error: string } | null;
function incomingFromHash(): IncomingPlayer {
  try {
    const shared = readPlayerHash(location.hash);
    return shared ? { shared } : null;
  } catch (e) {
    return { error: e instanceof Error ? e.message : '共有リンクを確認してください' };
  }
}
function clearShareHash() {
  if (location.hash.startsWith('#player='))
    history.replaceState(null, '', location.pathname + location.search);
}
export default function App() {
  const store = useStore();
  if (store.loadError)
    return (
      <div className="boot">
        <span className="boot-mark">脳汁</span>
        <h1>データを開けませんでした</h1>
        <p>{store.loadError}</p>
        <button className="primary" onClick={() => location.reload()}>
          再試行
        </button>
      </div>
    );
  if (!store.data)
    return (
      <div className="boot" role="status">
        <span className="boot-mark">脳汁</span>
        <p>READY…</p>
      </div>
    );
  return (
    <Game
      data={store.data}
      update={store.update}
      saveError={store.saveError}
      retrySave={store.retrySave}
    />
  );
}
function Game({
  data,
  update,
  saveError,
  retrySave,
}: {
  data: AppData;
  update: (f: (d: AppData) => AppData) => void;
  saveError: string;
  retrySave: () => void;
}) {
  const [screen, setScreen] = useState<Screen>(() => {
    const draft =
      data.players.find((p) => p.id === data.editingPlayer) ||
      data.players.find((p) => !p.candidates.length);
    return draft ? { kind: 'editor', id: draft.id } : { kind: 'members' };
  });
  const [results, setResults] = useState<ResultMap>({});
  const [resultRecordIds, setResultRecordIds] = useState<Record<string, string>>({});
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [historyOrigin, setHistoryOrigin] = useState<Screen>({ kind: 'history-list' });
  const openHistory = (id: string, origin: Screen) => {
    setHistoryOrigin(origin);
    setScreen({ kind: 'history', id });
  };
  const day = useGameDay();
  const recording = data.drawHistory.find((r) => r.id === recordingId);
  const changeOutcome = (id: string, outcome: MatchOutcome) =>
    update((d) => ({ ...d, drawHistory: setRecordOutcome(d.drawHistory, id, outcome) }));
  const changeBonus = (id: string, bonus: MatchBonus) =>
    update((d) => ({ ...d, drawHistory: setRecordBonus(d.drawHistory, id, bonus) }));
  const [round, setRound] = useState(0);
  const [busy, setBusy] = useState(false);
  const reducedMotion = useReducedMotion();
  const [sequence, setSequence] = useState<{ candidates: string[]; winner: string } | null>(null);
  const locked = useRef(false);
  const [rerolling, setRerolling] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [modal, setModal] = useState<'add' | 'rename' | 'delete' | 'share' | 'read' | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [incoming, setIncoming] = useState<IncomingPlayer>(incomingFromHash);
  const [pwa, setPwa] = useState<PwaStatus>({ offlineReady: false, update: null, error: false });
  const timers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  useEffect(() => registerPwa(setPwa), []);
  useEffect(() => {
    const receive = () => setIncoming(incomingFromHash());
    window.addEventListener('hashchange', receive);
    return () => window.removeEventListener('hashchange', receive);
  }, []);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [screen]);
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(''), 6000);
    return () => clearTimeout(t);
  }, [error]);
  const later = (fn: () => void, ms: number) => {
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      fn();
    }, ms);
    timers.current.add(timer);
  };
  const selected = data.players.filter((p) => data.selected.includes(p.id));
  const player = 'id' in screen ? data.players.find((p) => p.id === screen.id) : undefined;
  const sound = () => update((d) => ({ ...d, sound: !d.sound }));
  const beginSequence = (candidates: string[], winner: string) => {
    if (reducedMotion) {
      lock(0);
      return;
    }
    setSequence({ candidates, winner });
    lock(DRAW_REVEAL_MS);
  };
  const lock = (ms: number) => {
    locked.current = true;
    setBusy(true);
    later(() => {
      locked.current = false;
      setBusy(false);
      setRerolling(null);
      setSequence(null);
    }, ms);
  };
  const start = (kind: 'draw' | 'reroll' = 'draw') => {
    if (locked.current || !selected.length) return;
    let next: ResultMap | null;
    try {
      next = drawAll(selected, data.excludePrevious);
    } catch (e) {
      if (!(e instanceof LotteryCapacityError)) throw e;
      setError(e.message);
      return;
    }
    if (!next) {
      setError(
        '重複なしで割り当てられません。候補を増やすか「前回キャラを除外」をOFFにしてください。',
      );
      return;
    }
    const records = createDrawRecords(selected, next, data.excludePrevious, kind, Date.now());
    setResultRecordIds(Object.fromEntries(records.map((r) => [r.playerId, r.id])));
    playSound('start', data.sound);
    beginSequence(selected[0].candidates, next[selected[0].id]);
    setResults(next);
    setRound((r) => r + 1);
    update((d) => ({
      ...d,
      players: d.players.map((p) => (next[p.id] ? { ...p, lastFighter: next[p.id] } : p)),
      drawHistory: [...d.drawHistory, ...records],
    }));
    setScreen({ kind: 'results' });
  };
  const reroll = (id: string) => {
    if (locked.current) return;
    const p = data.players.find((p) => p.id === id)!;
    const next = drawOne(p, data.excludePrevious);
    if (!next) {
      setError(
        '再抽選できる候補がありません。候補を増やすか、メンバー画面で前回キャラ除外をOFFにしてください。',
      );
      return;
    }
    const records = createDrawRecords(
      [p],
      { [id]: next },
      data.excludePrevious,
      'reroll',
      Date.now(),
    );
    setResultRecordIds((ids) => ({ ...ids, [id]: records[0].id }));
    playSound('reroll', data.sound);
    beginSequence(p.candidates, next);
    setRerolling(id);
    setResults((r) => ({ ...r, [id]: next }));
    update((d) => ({
      ...d,
      players: d.players.map((p) => (p.id === id ? { ...p, lastFighter: next } : p)),
      drawHistory: [...d.drawHistory, ...records],
    }));
  };
  const edit = (id: string) => {
    update((d) => ({ ...d, editingPlayer: id }));
    setScreen({ kind: 'editor', id });
  };
  const finish = () => {
    if (!player?.candidates.length || locked.current) return;
    playSound('select', data.sound);
    setDone(true);
    lock(180);
    update((d) => ({ ...d, editingPlayer: null }));
    later(() => {
      setDone(false);
      setScreen({ kind: 'detail', id: player.id });
    }, 180);
  };
  return (
    <div className={`app-shell screen-${screen.kind} ${screen.kind === 'editor' ? 'wide' : ''}`}>
      {screen.kind === 'members' && (
        <Members
          data={data}
          busy={busy}
          toggle={(id) => {
            playSound('select', data.sound);
            update((d) => ({
              ...d,
              selected: d.selected.includes(id)
                ? d.selected.filter((x) => x !== id)
                : [...d.selected, id],
            }));
          }}
          settings={() => setScreen({ kind: 'settings' })}
          history={() => setScreen({ kind: 'history-list' })}
          exclude={() => update((d) => ({ ...d, excludePrevious: !d.excludePrevious }))}
          sound={sound}
          start={() => start()}
        />
      )}
      {screen.kind === 'results' && (
        <Results
          players={selected}
          results={results}
          round={round}
          records={data.drawHistory}
          recordIds={resultRecordIds}
          day={day}
          changeOutcome={changeOutcome}
          record={setRecordingId}
          openHistory={(id) => openHistory(id, { kind: 'results' })}
          excludePrevious={data.excludePrevious}
          busy={busy}
          rerolling={rerolling}
          reroll={reroll}
          again={() => start('reroll')}
          back={() => {
            if (!locked.current) setScreen({ kind: 'members' });
          }}
        />
      )}
      {screen.kind === 'settings' && (
        <Settings
          data={data}
          back={() => setScreen({ kind: 'members' })}
          add={() => setModal('add')}
          detail={(id) => setScreen({ kind: 'detail', id })}
          sound={sound}
          readLink={() => setModal('read')}
          pwa={pwa}
          update={() => {
            if (pwa.update && !saveError) activateUpdate(pwa.update);
          }}
        />
      )}
      {screen.kind === 'detail' && player && (
        <Detail
          player={player}
          back={() => setScreen({ kind: 'settings' })}
          rename={() => setModal('rename')}
          edit={() => edit(player.id)}
          remove={() => setModal('delete')}
          share={() => setModal('share')}
          history={() => openHistory(player.id, { kind: 'detail', id: player.id })}
        />
      )}
      {screen.kind === 'history' && player && (
        <History
          player={player}
          records={data.drawHistory}
          day={day}
          back={() => setScreen(historyOrigin)}
          record={setRecordingId}
        />
      )}
      {screen.kind === 'history-list' && (
        <HistoryHome
          players={data.players}
          records={data.drawHistory}
          day={day}
          back={() => setScreen({ kind: 'members' })}
          open={(id) => openHistory(id, { kind: 'history-list' })}
        />
      )}
      {recording && (
        <MatchRecordDialog
          key={recording.id}
          record={recording}
          change={changeOutcome}
          changeBonus={changeBonus}
          teammates={data.drawHistory.filter(
            (r) =>
              r.id !== recording.id &&
              r.playerId !== recording.playerId &&
              (Object.values(resultRecordIds).includes(recording.id)
                ? Object.values(resultRecordIds).includes(r.id)
                : r.at === recording.at && r.kind === 'draw'),
          )}
          applyTeam={(sourceId, targetIds) =>
            update((d) => ({
              ...d,
              drawHistory: applyMatchToPlayers(d.drawHistory, sourceId, targetIds),
            }))
          }
          close={() => setRecordingId(null)}
        />
      )}
      {screen.kind === 'editor' && player && (
        <Editor
          player={player}
          busy={busy}
          done={finish}
          selectAll={(selected) => {
            if (locked.current) return;
            playSound('select', data.sound);
            update((d) => ({
              ...d,
              players: d.players.map((p) =>
                p.id === player.id
                  ? { ...p, candidates: selected ? fighters.map((f) => f.id) : [] }
                  : p,
              ),
            }));
          }}
          toggle={(id) => {
            playSound('select', data.sound);
            update((d) => ({
              ...d,
              players: d.players.map((p) =>
                p.id === player.id
                  ? {
                      ...p,
                      candidates: p.candidates.includes(id)
                        ? p.candidates.filter((x) => x !== id)
                        : [...p.candidates, id],
                    }
                  : p,
              ),
            }));
          }}
        />
      )}
      {modal === 'share' && player && (
        <SharePlayerDialog player={player} close={() => setModal(null)} />
      )}
      {modal === 'read' && (
        <ReadPlayerLinkDialog
          close={() => setModal(null)}
          preview={(shared) => {
            setModal(null);
            setIncoming({ shared });
          }}
        />
      )}
      {incoming?.shared && (
        <ImportPlayerDialog
          shared={incoming.shared}
          players={data.players}
          close={() => {
            setIncoming(null);
            clearShareHash();
          }}
          apply={(targetId) => {
            try {
              let playerId = '';
              update((d) => {
                const result = importPlayer(d, incoming.shared, targetId);
                playerId = result.playerId;
                return result.data;
              });
              setIncoming(null);
              clearShareHash();
              setScreen({ kind: 'detail', id: playerId });
              setNotice('本人分のデータを読み込みました');
              later(() => setNotice(''), 2500);
            } catch (e) {
              setError(e instanceof Error ? e.message : '読み込めませんでした');
            }
          }}
        />
      )}
      {incoming?.error && (
        <Dialog
          title="共有リンクを確認してください"
          onClose={() => {
            setIncoming(null);
            clearShareHash();
          }}
        >
          <p>{incoming.error}</p>
          <button
            className="primary share-error-close"
            onClick={() => {
              setIncoming(null);
              clearShareHash();
            }}
          >
            閉じる
          </button>
        </Dialog>
      )}
      {modal === 'add' && (
        <NameDialog
          onClose={() => setModal(null)}
          onSubmit={(name) => {
            const p = createPlayer(name);
            update((d) => ({ ...d, players: [...d.players, p], editingPlayer: p.id }));
            setModal(null);
            setScreen({ kind: 'editor', id: p.id });
          }}
        />
      )}
      {modal === 'rename' && player && (
        <NameDialog
          initial={player.name}
          onClose={() => setModal(null)}
          onSubmit={(name) => {
            update((d) => ({
              ...d,
              players: d.players.map((p) => (p.id === player.id ? { ...p, name } : p)),
            }));
            setModal(null);
          }}
        />
      )}
      {modal === 'delete' && player && (
        <Dialog title="プレイヤーを削除？" onClose={() => setModal(null)}>
          <p>「{player.name}」の設定と抽選・勝敗記録を削除します。この操作は取り消せません。</p>
          <div className="dialog-actions">
            <button className="secondary" onClick={() => setModal(null)}>
              キャンセル
            </button>
            <button
              className="danger"
              onClick={() => {
                update((d) => ({
                  ...d,
                  players: d.players.filter((p) => p.id !== player.id),
                  drawHistory: d.drawHistory.filter((r) => r.playerId !== player.id),
                  selected: d.selected.filter((id) => id !== player.id),
                  editingPlayer: d.editingPlayer === player.id ? null : d.editingPlayer,
                }));
                setModal(null);
                setScreen({ kind: 'settings' });
              }}
            >
              削除
            </button>
          </div>
        </Dialog>
      )}
      {sequence && <DrawSequence {...sequence} />}
      {done && <DoneFlash />}
      {notice && (
        <div className="share-success" role="status">
          {notice}
        </div>
      )}
      {error && (
        <div className="toast" role="alert">
          <span>{error}</span>
          <button aria-label="閉じる" onClick={() => setError('')}>
            <X size={18} />
          </button>
        </div>
      )}
      {saveError && (
        <div className="save-error" role="alert">
          <span>{saveError}</span>
          <button onClick={retrySave}>再試行</button>
        </div>
      )}
    </div>
  );
}

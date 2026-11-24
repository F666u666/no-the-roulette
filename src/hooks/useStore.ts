import { useEffect, useRef, useState, useCallback } from 'react';
import type { AppData } from '../models/types';
import { loadData, saveData } from '../services/storage';
export function useStore() {
  const [data, setData] = useState<AppData | null>(null);
  const current = useRef<AppData | null>(null);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const queue = useRef(Promise.resolve());
  useEffect(() => {
    let alive = true;
    void loadData()
      .then((d) => {
        if (alive) {
          current.current = d;
          setData(d);
        }
      })
      .catch((e) => {
        if (alive) setLoadError(e instanceof Error ? e.message : '端末データを読み込めません。');
      });
    return () => {
      alive = false;
    };
  }, []);
  const persist = useCallback((next: AppData) => {
    queue.current = queue.current
      .catch(() => {})
      .then(() => saveData(next))
      .then(() => setSaveError(''))
      .catch(() =>
        setSaveError('端末に保存できませんでした。空き容量を確認して再試行してください。'),
      );
  }, []);
  const update = useCallback(
    (change: (d: AppData) => AppData) => {
      if (!current.current) return;
      const next = change(current.current);
      current.current = next;
      setData(next);
      persist(next);
    },
    [persist],
  );
  return {
    data,
    update,
    loadError,
    saveError,
    retrySave: () => {
      if (current.current) persist(current.current);
    },
  };
}

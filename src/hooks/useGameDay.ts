import { useEffect, useState } from 'react';
import { gameDay, nextGameDayBoundary } from '../services/drawHistory';
export function useGameDay() {
  const [day, setDay] = useState(() => gameDay(Date.now()));
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(timer);
      const now = Date.now();
      setDay(gameDay(now));
      timer = setTimeout(refresh, nextGameDayBoundary(now) - now + 30);
    };
    const visible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    refresh();
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('focus', refresh);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', visible);
      window.removeEventListener('focus', refresh);
    };
  }, []);
  return day;
}

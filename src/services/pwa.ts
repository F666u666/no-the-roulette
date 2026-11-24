import { isStandalone } from '../data/assetUrl';

export type PwaStatus = { offlineReady: boolean; update: ServiceWorker | null; error: boolean };
export function registerPwa(notify: (s: PwaStatus) => void) {
  if (isStandalone()) {
    notify({ offlineReady: true, update: null, error: false });
    return () => {};
  }
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return () => {};
  let alive = true;
  const replacingController = Boolean(navigator.serviceWorker.controller);
  let reloading = false;
  const state: PwaStatus = { offlineReady: false, update: null, error: false };
  const emit = () => {
    if (alive) notify({ ...state });
  };
  const controllerChanged = () => {
    if (!replacingController || reloading) return;
    reloading = true;
    window.location.reload();
  };
  navigator.serviceWorker.addEventListener('controllerchange', controllerChanged);
  void navigator.serviceWorker
    .register('/sw.js', { updateViaCache: 'none' })
    .then((reg) => {
      if (reg.waiting) {
        state.update = reg.waiting;
        emit();
      }
      reg.addEventListener('updatefound', () => {
        const worker = reg.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed') {
            if (navigator.serviceWorker.controller) state.update = reg.waiting;
            else state.offlineReady = true;
            emit();
          }
          if (worker.state === 'redundant') {
            state.error = true;
            emit();
          }
        });
      });
      return navigator.serviceWorker.ready;
    })
    .then(() => {
      state.offlineReady = true;
      emit();
    })
    .catch(() => {
      state.error = true;
      emit();
    });
  return () => {
    alive = false;
    navigator.serviceWorker.removeEventListener('controllerchange', controllerChanged);
  };
}
export function activateUpdate(worker: ServiceWorker) {
  navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), {
    once: true,
  });
  worker.postMessage({ type: 'SKIP_WAITING' });
}

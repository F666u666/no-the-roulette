import { assets } from '../data/assets';
import { assetUrl } from '../data/assetUrl';
type Sound = keyof typeof assets.sounds;
let context: AudioContext | undefined;
const buffers = new Map<Sound, AudioBuffer>();
const pending = new Map<Sound, Promise<AudioBuffer>>();
function getContext() {
  const C =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!C) return;
  return (context ??= new C());
}
function bufferFor(key: Sound, ctx: AudioContext) {
  let p = pending.get(key);
  if (!p) {
    p = fetch(assetUrl(assets.sounds[key]))
      .then((r) => {
        if (!r.ok) throw new Error('audio');
        return r.arrayBuffer();
      })
      .then((b) => ctx.decodeAudioData(b))
      .then((b) => {
        buffers.set(key, b);
        return b;
      })
      .catch((e) => {
        pending.delete(key);
        throw e;
      });
    pending.set(key, p);
  }
  return p;
}
// Called only by a user gesture. Resume happens synchronously before fetching/decoding.
export function playSound(key: Sound, enabled: boolean) {
  if (!enabled) return;
  try {
    const ctx = getContext();
    if (!ctx) return;
    void ctx.resume().catch(() => {});
    const play = (b: AudioBuffer) => {
      const source = ctx.createBufferSource();
      source.buffer = b;
      const gain = ctx.createGain();
      gain.gain.value = 0.3;
      source.connect(gain).connect(ctx.destination);
      source.start();
    };
    const cached = buffers.get(key);
    if (cached) play(cached);
    else
      void bufferFor(key, ctx)
        .then(play)
        .catch(() => {});
    for (const k of Object.keys(assets.sounds) as Sound[]) void bufferFor(k, ctx).catch(() => {});
  } catch {
    /* Audio is optional; never block a draw. */
  }
}

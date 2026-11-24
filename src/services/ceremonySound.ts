// Ceremony sounds for the multi-player draw stage.
// Synthesized with WebAudio so no extra audio assets are needed.
// Every function is a no-op when sound is disabled or AudioContext
// is unavailable, and never throws.

let context: AudioContext | undefined;
let tickCount = 0;

function ac(): AudioContext | undefined {
  try {
    const C =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!C) return undefined;
    context ??= new C();
    if (context.state === 'suspended') void context.resume().catch(() => {});
    return context;
  } catch {
    return undefined;
  }
}

function tone(
  ctx: AudioContext,
  freq: number,
  opts: { type?: OscillatorType; delay?: number; dur?: number; gain?: number; slideTo?: number } = {},
) {
  const { type = 'sine', delay = 0, dur = 0.12, gain = 0.1, slideTo } = opts;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(amp).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

/** Call from the draw button handler so the context is warm before the stage mounts. */
export function primeCeremony(enabled: boolean) {
  if (!enabled) return;
  ac();
}

/** Short slot-machine tick while portraits cycle (throttled internally). */
export function ceremonyTick(enabled: boolean) {
  if (!enabled) return;
  tickCount += 1;
  if (tickCount % 2 !== 0) return;
  const ctx = ac();
  if (!ctx) return;
  try {
    tone(ctx, tickCount % 4 === 0 ? 1560 : 1240, { type: 'square', dur: 0.03, gain: 0.022 });
  } catch {
    /* sound is decoration only */
  }
}

/** Two-tone blip when one player's fighter locks in. Pitch rises per player. */
export function ceremonyLock(enabled: boolean, index: number) {
  if (!enabled) return;
  const ctx = ac();
  if (!ctx) return;
  try {
    const base = 540 + index * 45;
    tone(ctx, base, { type: 'triangle', dur: 0.1, gain: 0.12 });
    tone(ctx, base * 1.5, { type: 'triangle', delay: 0.07, dur: 0.16, gain: 0.12 });
  } catch {
    /* sound is decoration only */
  }
}

/** Little fanfare arpeggio when the whole draw is decided. */
export function ceremonyFanfare(enabled: boolean) {
  if (!enabled) return;
  const ctx = ac();
  if (!ctx) return;
  try {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      tone(ctx, freq, { type: 'triangle', delay: i * 0.09, dur: 0.24, gain: 0.11 });
    });
    tone(ctx, 1567.98, { type: 'sine', delay: 0.38, dur: 0.34, gain: 0.07 });
    tone(ctx, 261.63, { type: 'triangle', delay: 0, dur: 0.4, gain: 0.05 });
  } catch {
    /* sound is decoration only */
  }
}

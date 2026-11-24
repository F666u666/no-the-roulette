import { PolySynth, Synth, now, start } from 'tone';

export async function playChime() {
  await start();
  const chime = new PolySynth(Synth, {
    volume: -21,
    oscillator: { type: 'sine' },
    envelope: { attack: 0.013, decay: 0.15, sustain: 0.12, release: 0.25 },
  }).toDestination();
  const time = now();
  chime.triggerAttackRelease('A4', 0.18, time);
  chime.triggerAttackRelease('D5', 0.19, time + 0.10);
  chime.triggerAttackRelease('F#5', 0.22, time + 0.21);
  window.setTimeout(() => chime.dispose(), 850);
}

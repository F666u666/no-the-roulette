import index from './asset-index.json';
// Character image paths live in fighters.ts. This registry holds player icons and sounds.
export const assets = {
  player: (id: string, icon: number) =>
    (index.players as Record<string, string>)[id] ?? `/assets/mascots/${icon}.svg`,
  sounds: {
    start: '/assets/sounds/start.wav',
    reroll: '/assets/sounds/reroll.wav',
    select: '/assets/sounds/select.wav',
  },
};

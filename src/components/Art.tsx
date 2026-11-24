import { useState } from 'react';
import { assets } from '../data/assets';
import { assetUrl } from '../data/assetUrl';
import type { Fighter, Player } from '../models/types';
export function FighterArt({
  fighter,
  portrait = false,
}: {
  fighter: Fighter;
  portrait?: boolean;
}) {
  const src = assetUrl(portrait ? fighter.portraitPath : fighter.imagePath);
  const [failed, setFailed] = useState<string | null>(null);
  if (failed === src) {
    return (
      <span className="missing-fighter-asset" role="alert">
        missing-fighter-assets: {fighter.name}
      </span>
    );
  }
  return (
    <img
      className="fighter-art"
      src={src}
      data-fighter-id={fighter.id}
      alt=""
      draggable={false}
      decoding="async"
      onError={() => setFailed(src)}
    />
  );
}
export function PlayerArt({ player }: { player: Player }) {
  return (
    <img
      className="player-art"
      src={assetUrl(assets.player(player.id, player.icon))}
      alt=""
      draggable={false}
      onError={(e) => {
        const fallback = assetUrl(`/assets/mascots/${player.icon}.svg`);
        if (e.currentTarget.getAttribute('src') !== fallback) e.currentTarget.src = fallback;
      }}
    />
  );
}

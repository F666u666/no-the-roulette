import { createRoot } from 'react-dom/client';
import { Player } from '@remotion/player';
import { Reveal } from '../../media/remotion/Reveal';
import type { SceneOptions } from './types';

export function play(surface: HTMLElement, { immediate }: SceneOptions) {
  const root = createRoot(surface);
  root.render(
    <Player component={Reveal} inputProps={{ title: '脳THEルーレット' }} fps={30}
      durationInFrames={60} compositionWidth={1080} compositionHeight={720}
      initialFrame={immediate ? 59 : 0} autoPlay={!immediate}
      style={{ width: '100%' }} />
  );
  return () => queueMicrotask(() => root.unmount());
}

import { Composition, registerRoot } from 'remotion';
import { Reveal } from './Reveal';

export function Root() {
  return (
    <Composition id="RouletteReveal" component={Reveal} durationInFrames={60} fps={30}
      width={1080} height={720} defaultProps={{ title: '脳THEルーレット' }} />
  );
}

registerRoot(Root);

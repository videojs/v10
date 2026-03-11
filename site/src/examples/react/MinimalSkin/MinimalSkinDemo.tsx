import { VJS10_DEMO_VIDEO } from '@/consts';
import { createPlayer, Poster } from '@videojs/react';
import { MinimalVideoSkin, Video, videoFeatures } from '@videojs/react/video';
import '@videojs/react/video/minimal-skin.css';

const Player = createPlayer({ features: videoFeatures });

/**
 * Live demo of the minimal video skin design.
 *
 * Features demonstrated:
 * - Clean, uncluttered interface
 * - Inline time display
 * - Simple, direct interactions
 * - Lightweight and fast
 */
export function MinimalSkinDemo() {
  return (
    <Player.Provider>
      <MinimalVideoSkin className="w-full aspect-video">
        <Video src={VJS10_DEMO_VIDEO.mp4} playsInline />
        <Poster src={VJS10_DEMO_VIDEO.poster} />
      </MinimalVideoSkin>
    </Player.Provider>
  );
}

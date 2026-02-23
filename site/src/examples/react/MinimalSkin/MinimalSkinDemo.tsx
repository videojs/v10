import { VJS8_DEMO_VIDEO } from '@/consts';
import { createPlayer, features, Poster } from '@videojs/react';
import { MinimalVideoSkin, Video } from '@videojs/react/video';
import '@videojs/react/video/minimal-skin.css';

const Player = createPlayer({ features: [...features.video] });

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
        <Video src={VJS8_DEMO_VIDEO.mp4} playsInline />
        <Poster src={VJS8_DEMO_VIDEO.poster} />
      </MinimalVideoSkin>
    </Player.Provider>
  );
}

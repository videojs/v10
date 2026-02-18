
import { VJS8_DEMO_VIDEO } from '@/consts';
import { createPlayer, features, Poster } from '@videojs/react';
import { VideoSkin, Video } from '@videojs/react/video';
import '@videojs/react/video/skin.css';

const Player = createPlayer({ features: [...features.video] });

/**
 * Live demo of the (default) frosted video skin design.
 *
 * Features demonstrated:
 * - Glassmorphic controls with backdrop blur
 * - Tooltips on hover for all buttons
 * - Vertical volume slider in a popover
 * - Time preview on timeline hover
 * - Smooth animations and transitions
 */
export function FrostedSkinDemo() {
  return (
    <Player.Provider>
      <VideoSkin className="w-full aspect-video">
        <Video src={VJS8_DEMO_VIDEO.mp4} playsInline />
        <Poster src={VJS8_DEMO_VIDEO.poster} />
      </VideoSkin>
    </Player.Provider>
  );
}

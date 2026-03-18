
import { VJS10_DEMO_VIDEO } from '@/consts';
import { createPlayer } from '@videojs/react';
import { VideoSkin, Video, videoFeatures } from '@videojs/react/video';
import '@videojs/react/video/skin.css';

const Player = createPlayer({ features: videoFeatures });

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
      <VideoSkin className="w-full aspect-video" poster={VJS10_DEMO_VIDEO.poster}>
        <Video src={VJS10_DEMO_VIDEO.mp4} playsInline />
      </VideoSkin>
    </Player.Provider>
  );
}

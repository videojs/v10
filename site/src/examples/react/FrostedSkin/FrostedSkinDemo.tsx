
import { VJS10_DEMO_VIDEO } from '@/consts';
import { VideoPlayer, VideoSkin, Video } from '@videojs/react/video';
import '@videojs/react/video/skin.css';

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
    <VideoPlayer poster={VJS10_DEMO_VIDEO.poster}>
      <VideoSkin className="aspect-video">
        <Video src={VJS10_DEMO_VIDEO.mp4} playsInline />
      </VideoSkin>
    </VideoPlayer>
  );
}

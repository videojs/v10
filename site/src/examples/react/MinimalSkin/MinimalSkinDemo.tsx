import { VJS10_DEMO_VIDEO } from '@/consts';
import { MinimalVideoSkin, VideoPlayer, Video } from '@videojs/react/video';
import '@videojs/react/video/minimal-skin.css';

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
    <VideoPlayer>
      <MinimalVideoSkin className="aspect-video" poster={VJS10_DEMO_VIDEO.poster}>
        <Video src={VJS10_DEMO_VIDEO.mp4} playsInline />
      </MinimalVideoSkin>
    </VideoPlayer>
  );
}

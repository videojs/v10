import { MinimalSkin, Video, VideoProvider } from '@videojs/react';
import { VJS8_DEMO_VIDEO } from '@/consts';
import '@videojs/react/skins/minimal.css';

/**
 * Live demo of the MinimalSkin design.
 *
 * Features demonstrated:
 * - Clean, uncluttered interface
 * - Inline time display
 * - Simple, direct interactions
 * - Lightweight and fast
 */
export function MinimalSkinDemo() {
  return (
    <VideoProvider>
      <MinimalSkin className="w-full aspect-video">
        <Video src={VJS8_DEMO_VIDEO.mp4} poster={VJS8_DEMO_VIDEO.poster} playsInline />
      </MinimalSkin>
    </VideoProvider>
  );
}

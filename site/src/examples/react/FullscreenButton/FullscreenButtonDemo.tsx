import { MediaContainer, Video, VideoProvider } from '@videojs/react';
import { VJS8_DEMO_VIDEO } from '@/consts';
import { BasicFullscreenButton } from './BasicFullscreenButton';

/**
 * Demo showing proper VideoProvider usage with FullscreenButton.
 * The FullscreenButton automatically toggles fullscreen mode for
 * the containing MediaContainer.
 */
export function FullscreenButtonDemo() {
  return (
    <VideoProvider>
      <MediaContainer style={{ position: 'relative', zIndex: 10 }}>
        <Video src={VJS8_DEMO_VIDEO.mp4} poster={VJS8_DEMO_VIDEO.poster} muted />
        <div style={{ position: 'absolute', bottom: '1rem', right: '1rem', zIndex: 10 }}>
          <BasicFullscreenButton />
        </div>
      </MediaContainer>
    </VideoProvider>
  );
}

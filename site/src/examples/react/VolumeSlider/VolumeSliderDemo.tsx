import { MediaContainer, Video, VideoProvider } from '@videojs/react';
import { VJS8_DEMO_VIDEO } from '@/consts';
import { BasicVolumeSlider } from './BasicVolumeSlider';

/**
 * Demo showing proper VideoProvider usage with VolumeSlider.
 * The VideoProvider wraps the entire media experience and provides
 * the necessary context for all media components.
 */
export function VolumeSliderDemo() {
  return (
    <VideoProvider>
      <MediaContainer style={{ position: 'relative', zIndex: 10 }}>
        <Video src={VJS8_DEMO_VIDEO.mp4} poster={VJS8_DEMO_VIDEO.poster} muted />
        <div style={{ position: 'absolute', bottom: '1rem', right: '1rem', zIndex: 10 }}>
          <BasicVolumeSlider />
        </div>
      </MediaContainer>
    </VideoProvider>
  );
}

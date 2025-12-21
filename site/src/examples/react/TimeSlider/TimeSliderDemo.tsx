import { MediaContainer, Video, VideoProvider } from '@videojs/react-preview';
import { VJS8_DEMO_VIDEO } from '@/consts';
import { BasicTimeSlider } from './BasicTimeSlider';

/**
 * Demo showing proper VideoProvider usage with TimeSlider.
 * The VideoProvider wraps the entire media experience and provides
 * the necessary context for all media components.
 */
export function TimeSliderDemo() {
  return (
    <VideoProvider>
      <MediaContainer style={{ position: 'relative', zIndex: 10 }}>
        <Video
          src={VJS8_DEMO_VIDEO.mp4}
          poster={VJS8_DEMO_VIDEO.poster}
          muted
        />
        <div style={{ position: 'absolute', bottom: '1rem', left: '1rem', right: '1rem', zIndex: 10 }}>
          <BasicTimeSlider />
        </div>
      </MediaContainer>
    </VideoProvider>
  );
}

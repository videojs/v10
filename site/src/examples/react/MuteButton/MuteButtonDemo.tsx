import { MediaContainer, Video, VideoProvider } from '@videojs/react-preview';
import { VJS8_DEMO_VIDEO } from '@/consts';
import { BasicMuteButton } from './BasicMuteButton';

/**
 * Demo showing proper VideoProvider usage with MuteButton.
 * The MuteButton automatically reflects the current volume state
 * and toggles mute/unmute on click.
 */
export function MuteButtonDemo() {
  return (
    <VideoProvider>
      <MediaContainer style={{ position: 'relative', zIndex: 10 }}>
        <Video
          src={VJS8_DEMO_VIDEO.mp4}
          poster={VJS8_DEMO_VIDEO.poster}
          muted
        />
        <div style={{ position: 'absolute', bottom: '1rem', left: '1rem', zIndex: 10 }}>
          <BasicMuteButton />
        </div>
      </MediaContainer>
    </VideoProvider>
  );
}

import { CaptionsButton, Container } from '@videojs/react';
import { Video, VideoPlayer } from '@videojs/react/video';

export default function BasicUsage() {
  return (
    <VideoPlayer>
      <Container className="media-container">
        <Video src="{{VJS10_DEMO_VIDEO_MP4}}" autoPlay muted playsInline loop>
          <track kind="captions" src="/docs/demos/text-tracks/captions.vtt" srcLang="en" label="English" default />
        </Video>
        <CaptionsButton
          className="media-captions-button"
          render={(props, state) => (
            <button {...props}>{state.subtitlesShowing ? 'Captions Off' : 'Captions On'}</button>
          )}
        />
      </Container>
    </VideoPlayer>
  );
}

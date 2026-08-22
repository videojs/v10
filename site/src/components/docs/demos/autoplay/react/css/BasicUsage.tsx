import { Container, PlayButton } from '@videojs/react';
import { Video, VideoPlayer } from '@videojs/react/video';

export default function BasicUsage() {
  return (
    <VideoPlayer>
      <Container className="media-container">
        <Video src="{{VJS10_DEMO_VIDEO_MP4}}" autoPlay muted playsInline />
        <PlayButton
          className="media-play-button"
          render={(props, state) => (
            <button {...props}>{state.ended ? 'Replay' : state.paused ? 'Play' : 'Pause'}</button>
          )}
        />
      </Container>
    </VideoPlayer>
  );
}

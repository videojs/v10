import { Container, createPlayer, PlayButton, Poster } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

const { Player } = createPlayer({ features: videoFeatures });

export default function BasicUsage() {
  return (
    <Player poster="{{VJS10_DEMO_POSTER}}">
      <Container className="media-container">
        <Video src="{{VJS10_DEMO_VIDEO_MP4}}" playsInline />

        <Poster className="media-poster" />

        <PlayButton
          className="media-play-button"
          render={(props, state) => <button {...props}>{state.paused ? 'Play' : 'Pause'}</button>}
        />
      </Container>
    </Player>
  );
}

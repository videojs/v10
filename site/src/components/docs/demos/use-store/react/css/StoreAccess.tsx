import { Container, createPlayer, useStore } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

const { Player, usePlayer } = createPlayer({
  features: videoFeatures,
});

function SeekControls() {
  const store = usePlayer();
  const s = useStore(store);

  return (
    <div className="controls">
      <button type="button" onClick={() => s.seek(0)}>
        Go to start
      </button>
      <button type="button" onClick={() => s.seek(s.state.duration / 2)}>
        Go to middle
      </button>
    </div>
  );
}

export default function StoreAccess() {
  return (
    <Player>
      <Container className="media-container">
        <Video src="{{VJS10_DEMO_VIDEO_MP4}}" autoPlay muted playsInline loop />
        <SeekControls />
      </Container>
    </Player>
  );
}

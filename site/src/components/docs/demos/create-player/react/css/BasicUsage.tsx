import { Container, createPlayer } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

const { Player, usePlayer } = createPlayer({
  features: videoFeatures,
});

function Controls() {
  const store = usePlayer();
  const paused = usePlayer((s) => s.paused);

  return (
    <div className="controls">
      <button type="button" className="button" onClick={() => (paused ? store.play() : store.pause())}>
        {paused ? 'Play' : 'Pause'}
      </button>
    </div>
  );
}

export default function BasicUsage() {
  return (
    <Player>
      <Container className="media-container">
        <Video src="{{VJS10_DEMO_VIDEO_MP4}}" autoPlay muted playsInline />
        <Controls />
      </Container>
    </Player>
  );
}

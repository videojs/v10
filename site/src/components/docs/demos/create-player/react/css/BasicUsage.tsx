import { createPlayer } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

const { Provider, Container, usePlayer } = createPlayer({
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
    <Provider>
      <Container className="video-player">
        <Video
          src="https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/highest.mp4"
          autoPlay
          muted
          playsInline
        />
        <Controls />
      </Container>
    </Provider>
  );
}

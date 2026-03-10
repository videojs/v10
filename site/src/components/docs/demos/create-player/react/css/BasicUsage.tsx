import { createPlayer } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

import './BasicUsage.css';

const { Provider, Container, usePlayer } = createPlayer({
  features: videoFeatures,
});

function Controls() {
  const store = usePlayer();
  const paused = usePlayer((s) => s.paused);

  return (
    <div className="react-create-player-basic__controls">
      <button
        type="button"
        className="react-create-player-basic__button"
        onClick={() => (paused ? store.play() : store.pause())}
      >
        {paused ? 'Play' : 'Pause'}
      </button>
    </div>
  );
}

export default function BasicUsage() {
  return (
    <Provider>
      <Container className="react-create-player-basic">
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

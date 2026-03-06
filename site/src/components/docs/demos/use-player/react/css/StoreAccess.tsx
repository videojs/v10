import { createPlayer, usePlayer } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

import './StoreAccess.css';

const { Provider, Container } = createPlayer({
  features: videoFeatures,
});

function Controls() {
  const store = usePlayer();

  return (
    <div className="react-use-player-store__controls">
      <button type="button" onClick={() => store.play()}>
        Play
      </button>
      <button type="button" onClick={() => store.pause()}>
        Pause
      </button>
    </div>
  );
}

export default function StoreAccess() {
  return (
    <Provider>
      <Container className="react-use-player-store">
        <Video
          src="https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/highest.mp4"
          autoPlay
          muted
          playsInline
          loop
        />
        <Controls />
      </Container>
    </Provider>
  );
}

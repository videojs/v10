import { createPlayer, features, usePlayer, useStore } from '@videojs/react';
import { Video } from '@videojs/react/video';

import './StoreAccess.css';

const { Provider, Container } = createPlayer({
  features: features.video,
});

function SeekControls() {
  const store = usePlayer();
  const s = useStore(store);

  return (
    <div className="react-use-store-access__controls">
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
    <Provider>
      <Container className="react-use-store-access">
        <Video
          src="https://stream.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/highest.mp4"
          autoPlay
          muted
          playsInline
          loop
        />
        <SeekControls />
      </Container>
    </Provider>
  );
}

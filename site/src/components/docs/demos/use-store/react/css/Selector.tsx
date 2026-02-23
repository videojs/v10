import { createPlayer, features, usePlayer, useStore } from '@videojs/react';
import { Video } from '@videojs/react/video';

import './Selector.css';

const { Provider, Container } = createPlayer({
  features: features.video,
});

function DerivedState() {
  const store = usePlayer();
  const derived = useStore(store, (s) => ({
    remaining: s.duration - s.currentTime,
    progress: s.duration > 0 ? (s.currentTime / s.duration) * 100 : 0,
  }));

  return (
    <dl className="react-use-store-selector__state">
      <div>
        <dt>Remaining</dt>
        <dd>{derived.remaining.toFixed(1)}s</dd>
      </div>
      <div>
        <dt>Progress</dt>
        <dd>{derived.progress.toFixed(1)}%</dd>
      </div>
    </dl>
  );
}

export default function Selector() {
  return (
    <Provider>
      <Container className="react-use-store-selector">
        <Video
          src="https://stream.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/highest.mp4"
          autoPlay
          muted
          playsInline
          loop
        />
        <DerivedState />
      </Container>
    </Provider>
  );
}

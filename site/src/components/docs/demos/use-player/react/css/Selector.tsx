import { createPlayer, usePlayer } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

import './Selector.css';

const { Provider, Container } = createPlayer({
  features: videoFeatures,
});

function StateDisplay() {
  const state = usePlayer((s) => ({
    paused: s.paused,
    currentTime: s.currentTime,
    duration: s.duration,
  }));

  return (
    <dl className="react-use-player-selector__state">
      <div>
        <dt>Paused</dt>
        <dd>{String(state.paused)}</dd>
      </div>
      <div>
        <dt>Time</dt>
        <dd>
          {state.currentTime.toFixed(1)}s / {state.duration.toFixed(1)}s
        </dd>
      </div>
    </dl>
  );
}

export default function Selector() {
  return (
    <Provider>
      <Container className="react-use-player-selector">
        <Video
          src="https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/highest.mp4"
          autoPlay
          muted
          playsInline
          loop
        />
        <StateDisplay />
      </Container>
    </Provider>
  );
}

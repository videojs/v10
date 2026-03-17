import { createPlayer } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

import './Selector.css';

const Player = createPlayer({
  features: videoFeatures,
});

function StateDisplay() {
  const state = Player.usePlayer((s) => ({
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
    <Player.Provider>
      <Player.Container className="react-use-player-selector">
        <Video
          src="https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/highest.mp4"
          autoPlay
          muted
          playsInline
          loop
        />
        <StateDisplay />
      </Player.Container>
    </Player.Provider>
  );
}

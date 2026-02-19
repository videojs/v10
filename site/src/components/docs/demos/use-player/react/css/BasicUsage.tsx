import { createPlayer, features } from '@videojs/react';
import { Video } from '@videojs/react/video';

import './BasicUsage.css';

const Player = createPlayer({ features: [...features.video] });

function Actions() {
  const store = Player.usePlayer();

  return (
    <div className="react-use-player-basic__actions">
      <span className="react-use-player-basic__heading">Actions</span>
      <div className="react-use-player-basic__buttons">
        <button type="button" onClick={() => store.play()}>
          Play
        </button>
        <button type="button" onClick={() => store.pause()}>
          Pause
        </button>
        <button type="button" onClick={() => store.changeVolume(0.5)}>
          50% Volume
        </button>
      </div>
    </div>
  );
}

function StateDisplay() {
  const state = Player.usePlayer((s) => ({
    paused: s.paused,
    currentTime: s.currentTime,
    volume: s.volume,
  }));

  return (
    <dl className="react-use-player-basic__state">
      <span className="react-use-player-basic__heading">State</span>
      <div>
        <dt>Paused</dt>
        <dd>{String(state.paused)}</dd>
      </div>
      <div>
        <dt>Time</dt>
        <dd>{state.currentTime.toFixed(1)}s</dd>
      </div>
      <div>
        <dt>Volume</dt>
        <dd>{Math.round(state.volume * 100)}%</dd>
      </div>
    </dl>
  );
}

export default function BasicUsage() {
  return (
    <Player.Provider>
      <Player.Container className="react-use-player-basic">
        <Video
          src="https://stream.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/highest.mp4"
          autoPlay
          muted
          playsInline
        />
        <div className="react-use-player-basic__panel">
          <Actions />
          <StateDisplay />
        </div>
      </Player.Container>
    </Player.Provider>
  );
}

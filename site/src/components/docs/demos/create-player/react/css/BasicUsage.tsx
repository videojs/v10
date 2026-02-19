import { createPlayer, features } from '@videojs/react';
import { Video } from '@videojs/react/video';

import './BasicUsage.css';

const Player = createPlayer({ features: [...features.video] });

function Controls() {
  const store = Player.usePlayer();
  const paused = Player.usePlayer((s) => s.paused);

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
    <Player.Provider>
      <Player.Container className="react-create-player-basic">
        <Video
          src="https://stream.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/highest.mp4"
          autoPlay
          muted
          playsInline
        />
        <Controls />
      </Player.Container>
    </Player.Provider>
  );
}

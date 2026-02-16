import { createPlayer, features, useStore } from '@videojs/react';
import { Video } from '@videojs/react/video';

import './BasicUsage.css';

const Player = createPlayer({ features: [...features.video] });

function DerivedState() {
  const store = Player.usePlayer();
  const derived = useStore(store, (s) => ({
    remaining: s.duration - s.currentTime,
    progress: s.duration > 0 ? (s.currentTime / s.duration) * 100 : 0,
  }));

  return (
    <dl className="react-use-store-basic__derived">
      <span className="react-use-store-basic__heading">Derived State</span>
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

function SeekControls() {
  const store = Player.usePlayer();
  const s = useStore(store);

  return (
    <div className="react-use-store-basic__seek">
      <span className="react-use-store-basic__heading">Seek Controls</span>
      <div className="react-use-store-basic__buttons">
        <button type="button" onClick={() => s.seek(0)}>
          Go to start
        </button>
        <button type="button" onClick={() => s.seek(s.state.duration / 2)}>
          Go to middle
        </button>
      </div>
    </div>
  );
}

export default function BasicUsage() {
  return (
    <Player.Provider>
      <Player.Container className="react-use-store-basic">
        <Video
          src="https://stream.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/highest.mp4"
          autoPlay
          muted
          playsInline
        />
        <div className="react-use-store-basic__panel">
          <DerivedState />
          <SeekControls />
        </div>
      </Player.Container>
    </Player.Provider>
  );
}

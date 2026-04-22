import { createPlayer, useStore } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

const Player = createPlayer({
  features: videoFeatures,
});

function SeekControls() {
  const store = Player.usePlayer();
  const s = useStore(store);

  return (
    <div className="controls">
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
    <Player.Provider>
      <Player.Container className="media-container">
        <Video
          src="https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/highest.mp4"
          autoPlay
          muted
          playsInline
          loop
        />
        <SeekControls />
      </Player.Container>
    </Player.Provider>
  );
}

import { createPlayer } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

const Player = createPlayer({
  features: videoFeatures,
});

function Controls() {
  const store = Player.usePlayer();

  return (
    <div className="controls">
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
    <Player.Provider>
      <Player.Container className="media-container">
        <Video src="{{VJS10_DEMO_VIDEO_MP4}}" autoPlay muted playsInline loop />
        <Controls />
      </Player.Container>
    </Player.Provider>
  );
}

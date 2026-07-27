import { createPlayer } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

const Player = createPlayer({
  features: videoFeatures,
});

function Controls() {
  const store = Player.usePlayer();
  const paused = Player.usePlayer((s) => s.paused);

  return (
    <div className="controls">
      <button type="button" className="button" onClick={() => (paused ? store.play() : store.pause())}>
        {paused ? 'Play' : 'Pause'}
      </button>
    </div>
  );
}

export default function BasicUsage() {
  return (
    <Player.Provider>
      <Player.Container className="media-container">
        <Video src="{{VJS10_DEMO_VIDEO_MP4}}" autoPlay muted playsInline />
        <Controls />
      </Player.Container>
    </Player.Provider>
  );
}

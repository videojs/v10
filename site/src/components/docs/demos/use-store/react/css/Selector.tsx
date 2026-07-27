import { createPlayer, useStore } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

const Player = createPlayer({
  features: videoFeatures,
});

function DerivedState() {
  const store = Player.usePlayer();
  const derived = useStore(store, (s) => ({
    remaining: s.duration - s.currentTime,
    progress: s.duration > 0 ? (s.currentTime / s.duration) * 100 : 0,
  }));

  return (
    <dl className="panel">
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
    <Player.Provider>
      <Player.Container className="media-container">
        <Video src="{{VJS10_DEMO_VIDEO_MP4}}" autoPlay muted playsInline loop />
        <DerivedState />
      </Player.Container>
    </Player.Provider>
  );
}

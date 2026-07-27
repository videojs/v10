import { createPlayer } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

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
    <dl className="panel">
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
      <Player.Container className="media-container">
        <Video src="{{VJS10_DEMO_VIDEO_MP4}}" autoPlay muted playsInline loop />
        <StateDisplay />
      </Player.Container>
    </Player.Provider>
  );
}

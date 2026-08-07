import { createPlayer } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

const Player = createPlayer({ features: videoFeatures });

const SOURCES = [
  { label: 'Feature', src: '{{VJS10_DEMO_VIDEO_MP4}}' },
  { label: 'Background', src: '{{VJS10_DEMO_BACKGROUND_VIDEO_MP4}}' },
];

function SourceSwitcher() {
  const store = Player.usePlayer();
  const state = Player.usePlayer((s) => ({ source: s.source, canPlay: s.canPlay }));

  return (
    <div className="source-switcher">
      {SOURCES.map((item) => (
        <button
          key={item.label}
          type="button"
          className="control-button"
          data-active={state.source === item.src || undefined}
          onClick={() => store.loadSource(item.src)}
        >
          {item.label}
        </button>
      ))}
      <span className="load-state">{state.canPlay ? 'Ready' : 'Loading…'}</span>
    </div>
  );
}

export default function BasicUsage() {
  return (
    <Player.Provider>
      <Player.Container className="media-container">
        <Video src="{{VJS10_DEMO_VIDEO_MP4}}" autoPlay muted playsInline loop />
        <SourceSwitcher />
      </Player.Container>
    </Player.Provider>
  );
}

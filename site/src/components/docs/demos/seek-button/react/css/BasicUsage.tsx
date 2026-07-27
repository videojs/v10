import { createPlayer, SeekButton } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

const Player = createPlayer({ features: videoFeatures });

export default function BasicUsage() {
  return (
    <Player.Provider>
      <Player.Container className="media-container">
        <Video src="{{VJS10_DEMO_VIDEO_MP4}}" autoPlay muted playsInline loop />
        <div className="buttons">
          <SeekButton
            seconds={-5}
            className="media-seek-button"
            render={(props, state) => (
              <button {...props}>
                {state.direction === 'backward' ? '\u23EA' : '\u23E9'} {5}s
              </button>
            )}
          />
          <SeekButton
            seconds={10}
            className="media-seek-button"
            render={(props, state) => (
              <button {...props}>
                {10}s {state.direction === 'forward' ? '\u23E9' : '\u23EA'}
              </button>
            )}
          />
        </div>
      </Player.Container>
    </Player.Provider>
  );
}

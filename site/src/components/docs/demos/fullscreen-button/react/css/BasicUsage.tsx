import { createPlayer, FullscreenButton } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

const Player = createPlayer({ features: videoFeatures });

export default function BasicUsage() {
  return (
    <Player.Provider>
      <Player.Container className="media-container">
        <Video src="{{VJS10_DEMO_VIDEO_MP4}}" autoPlay muted playsInline loop />
        <FullscreenButton
          className="media-fullscreen-button"
          render={(props, state) => <button {...props}>{state.fullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</button>}
        />
      </Player.Container>
    </Player.Provider>
  );
}

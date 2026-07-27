import { CastButton, createPlayer } from '@videojs/react';
import { HlsJsVideo } from '@videojs/react/media/hlsjs-video';
import { videoFeatures } from '@videojs/react/video';

const Player = createPlayer({ features: videoFeatures });

export default function BasicUsage() {
  return (
    <Player.Provider>
      <Player.Container className="media-container">
        <HlsJsVideo src="{{VJS10_DEMO_VIDEO_HLS}}" autoPlay muted playsInline loop />
        <CastButton
          className="media-cast-button"
          render={(props, state) => (
            <button {...props}>{state.castState === 'connected' ? 'Stop casting' : 'Start casting'}</button>
          )}
        />
      </Player.Container>
    </Player.Provider>
  );
}

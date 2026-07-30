import { AirPlayButton, createPlayer } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

const Player = createPlayer({ features: videoFeatures });

export default function BasicUsage() {
  return (
    <Player.Provider>
      <Player.Container className="media-container">
        <Video src="{{VJS10_DEMO_VIDEO_MP4}}" autoPlay muted playsInline loop />
        <AirPlayButton
          className="media-airplay-button"
          render={(props, state) => (
            <button {...props}>{state.state === 'connected' ? 'Stop AirPlay' : 'Start AirPlay'}</button>
          )}
        />
      </Player.Container>
    </Player.Provider>
  );
}

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
          render={(props, state) => {
            const label =
              state.availability === 'unsupported'
                ? 'AirPlay not supported'
                : state.state === 'connected'
                  ? 'Stop AirPlay'
                  : state.availability === 'unavailable'
                    ? 'No AirPlay devices found'
                    : 'Start AirPlay';
            return <button {...props}>{label}</button>;
          }}
        />
      </Player.Container>
    </Player.Provider>
  );
}

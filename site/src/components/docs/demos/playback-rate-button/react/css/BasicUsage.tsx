import { createPlayer, PlaybackRateButton } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

const Player = createPlayer({ features: videoFeatures });

export default function BasicUsage() {
  return (
    <Player.Provider>
      <Player.Container className="media-container">
        <Video src="{{VJS10_DEMO_VIDEO_MP4}}" autoPlay muted playsInline loop />
        <PlaybackRateButton
          className="media-playback-rate-button"
          render={(props, state) => <button {...props}>{Math.round(state.rate * 10) / 10}&times;</button>}
        />
      </Player.Container>
    </Player.Provider>
  );
}

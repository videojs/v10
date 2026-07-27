import { createPlayer, Time } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

const Player = createPlayer({ features: videoFeatures });

export default function CustomNegativeSign() {
  return (
    <Player.Provider>
      <Player.Container className="media-container">
        <Video src="{{VJS10_DEMO_VIDEO_MP4}}" autoPlay muted playsInline loop />
        <Time.Value type="remaining" negativeSign="~" className="media-time" />
      </Player.Container>
    </Player.Provider>
  );
}

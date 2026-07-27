import { createPlayer, Time } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

const Player = createPlayer({ features: videoFeatures });

export default function CurrentDuration() {
  return (
    <Player.Provider>
      <Player.Container className="media-container">
        <Video src="{{VJS10_DEMO_VIDEO_MP4}}" autoPlay muted playsInline loop />
        <Time.Group className="time-group">
          <Time.Value type="current" />
          <Time.Separator />
          <Time.Value type="duration" />
        </Time.Group>
      </Player.Container>
    </Player.Provider>
  );
}

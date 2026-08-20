import { Container, createPlayer, Time } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

const { Player } = createPlayer({ features: videoFeatures });

export default function Remaining() {
  return (
    <Player>
      <Container className="media-container">
        <Video src="{{VJS10_DEMO_VIDEO_MP4}}" autoPlay muted playsInline loop />
        <Time.Value type="remaining" className="media-time" />
      </Container>
    </Player>
  );
}

import { Container, createPlayer } from '@videojs/react';
import { Audio, audioFeatures } from '@videojs/react/audio';

import './BasicUsage.css';

const { Player } = createPlayer({ features: audioFeatures });

export default function BasicUsage() {
  return (
    <Player>
      <Container className="react-audio-basic">
        <Audio className="react-audio-basic__media" controls preload="metadata">
          <source src="{{VJS10_DEMO_VIDEO_MP4}}" />
        </Audio>
      </Container>
    </Player>
  );
}

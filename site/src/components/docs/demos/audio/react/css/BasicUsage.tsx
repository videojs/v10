import { Container } from '@videojs/react';
import { Audio, AudioPlayer } from '@videojs/react/audio';

import './BasicUsage.css';

export default function BasicUsage() {
  return (
    <AudioPlayer>
      <Container className="react-audio-basic">
        <Audio className="react-audio-basic__media" controls preload="metadata">
          <source src="{{VJS10_DEMO_AUDIO_M4A}}" />
        </Audio>
      </Container>
    </AudioPlayer>
  );
}

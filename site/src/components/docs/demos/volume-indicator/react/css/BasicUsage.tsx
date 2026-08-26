import { Container, createPlayer, Hotkey, VolumeIndicator } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

import './BasicUsage.css';

const { Player } = createPlayer({ features: videoFeatures });

export default function BasicUsage() {
  return (
    <Player>
      <Container className="react-volume-indicator-basic" tabIndex={0}>
        <Video
          ref={(video) => {
            if (video) video.volume = 0.5;
          }}
          src="{{VJS10_DEMO_VIDEO_MP4}}"
          autoPlay
          muted
          playsInline
          loop
        />
        <p className="react-volume-indicator-basic__instructions">Focus the player · M: mute · ↑/↓: volume ±5%</p>
        <VolumeIndicator.Root className="react-volume-indicator-basic__indicator" aria-hidden="true">
          <VolumeIndicator.Fill className="react-volume-indicator-basic__fill">
            <VolumeIndicator.Value className="react-volume-indicator-basic__value" />
          </VolumeIndicator.Fill>
        </VolumeIndicator.Root>
        <Hotkey keys="m" action="toggleMuted" />
        <Hotkey keys="ArrowUp" action="volumeStep" value={0.05} />
        <Hotkey keys="ArrowDown" action="volumeStep" value={-0.05} />
      </Container>
    </Player>
  );
}

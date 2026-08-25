import { Container, createPlayer, Hotkey, SeekIndicator } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

import './BasicUsage.css';

const { Player } = createPlayer({ features: videoFeatures });

export default function BasicUsage() {
  return (
    <Player>
      <Container className="react-seek-indicator-basic" tabIndex={0}>
        <Video src="{{VJS10_DEMO_VIDEO_MP4}}" autoPlay muted playsInline loop />
        <p className="react-seek-indicator-basic__instructions">
          Focus the player · ←/→: seek 10s · 0–9: seek to percent
        </p>
        <SeekIndicator.Root className="react-seek-indicator-basic__indicator" aria-hidden="true">
          <SeekIndicator.Value className="react-seek-indicator-basic__value" />
        </SeekIndicator.Root>
        <Hotkey keys="ArrowLeft" action="seekStep" value={-10} />
        <Hotkey keys="ArrowRight" action="seekStep" value={10} />
        <Hotkey keys="0-9" action="seekToPercent" />
      </Container>
    </Player>
  );
}

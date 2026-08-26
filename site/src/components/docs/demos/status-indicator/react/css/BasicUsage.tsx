import { Container, createPlayer, Hotkey, StatusIndicator } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

import './BasicUsage.css';

const { Player } = createPlayer({ features: videoFeatures });

const statusActions = [
  'togglePaused',
  'toggleMuted',
  'toggleSubtitles',
  'toggleFullscreen',
  'togglePictureInPicture',
] as const;

export default function BasicUsage() {
  return (
    <Player>
      <Container className="react-status-indicator-basic" tabIndex={0}>
        <Video src="{{VJS10_DEMO_VIDEO_MP4}}" autoPlay muted playsInline loop>
          <track kind="captions" src="/docs/demos/captions-button/captions.vtt" srcLang="en" label="English" />
        </Video>
        <p className="react-status-indicator-basic__instructions">
          Focus the player · K: play/pause · M: mute · F: fullscreen · C: captions · I: picture-in-picture
        </p>
        <StatusIndicator.Root
          className="react-status-indicator-basic__indicator"
          actions={statusActions}
          aria-hidden="true"
        >
          <StatusIndicator.Value className="react-status-indicator-basic__value" />
        </StatusIndicator.Root>
        <Hotkey keys="k" action="togglePaused" />
        <Hotkey keys="m" action="toggleMuted" />
        <Hotkey keys="f" action="toggleFullscreen" />
        <Hotkey keys="c" action="toggleSubtitles" />
        <Hotkey keys="i" action="togglePictureInPicture" />
      </Container>
    </Player>
  );
}

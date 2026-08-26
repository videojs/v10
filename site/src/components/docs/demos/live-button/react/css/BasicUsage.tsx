import { Container, createPlayer, LiveButton, SeekButton } from '@videojs/react';
import { liveVideoFeatures } from '@videojs/react/live-video';
import { HlsJsVideo } from '@videojs/react/media/hlsjs-video';

const { Player } = createPlayer({ features: liveVideoFeatures });

export default function BasicUsage() {
  return (
    <Player>
      <Container className="react-live-button-basic">
        <HlsJsVideo src="{{VJS10_DEMO_LIVE_HLS}}" autoPlay muted playsInline />
        <div className="react-live-button-basic__buttons">
          <SeekButton seconds={-30} className="react-live-button-basic__seek">
            {'⏪'} 30s
          </SeekButton>
          <LiveButton className="react-live-button-basic__live">
            <span className="react-live-button-basic__dot" />
            Live
          </LiveButton>
        </div>
      </Container>
    </Player>
  );
}

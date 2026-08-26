import { AirPlayButton, CastButton, Container, createPlayer } from '@videojs/react';
import { GoogleCast } from '@videojs/react/media/google-cast';
import { HlsJsVideo } from '@videojs/react/media/hlsjs-video';
import { videoFeatures } from '@videojs/react/video';

const { Player } = createPlayer({ features: videoFeatures });

export default function BasicUsage() {
  return (
    <Player>
      <Container className="media-container">
        <HlsJsVideo src="{{VJS10_DEMO_VIDEO_HLS}}" autoPlay muted playsInline loop />
        <GoogleCast />
        <div className="media-remote-buttons">
          <AirPlayButton
            className="media-airplay-button"
            render={(props, state) => (
              <button {...props}>{state.state === 'connected' ? 'Stop AirPlay' : 'Start AirPlay'}</button>
            )}
          />
          <CastButton
            className="media-cast-button"
            render={(props, state) => (
              <button {...props}>{state.connection === 'connected' ? 'Stop casting' : 'Start casting'}</button>
            )}
          />
        </div>
      </Container>
    </Player>
  );
}

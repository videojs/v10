import { BufferingIndicator, createPlayer } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

const Player = createPlayer({ features: videoFeatures });

export default function BasicUsage() {
  return (
    <Player.Provider>
      <Player.Container className="media-container">
        <Video src="{{VJS10_DEMO_VIDEO_MP4}}" autoPlay muted playsInline loop />
        <BufferingIndicator
          className="media-buffering-indicator"
          render={(props, state) => <div {...props}>{state.visible && <div className="spinner" />}</div>}
        />
      </Player.Container>
    </Player.Provider>
  );
}

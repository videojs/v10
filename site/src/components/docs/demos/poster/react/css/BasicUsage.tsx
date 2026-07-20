import { createPlayer, PlayButton, Poster } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

const Player = createPlayer({ features: videoFeatures });

export default function BasicUsage() {
  return (
    <Player.Provider>
      <Player.Container className="media-container">
        <Video src="{{VJS10_DEMO_VIDEO_MP4}}" playsInline />

        <Poster className="media-poster" src="{{VJS10_DEMO_POSTER}}" />

        <PlayButton
          className="media-play-button"
          render={(props, state) => <button {...props}>{state.paused ? 'Play' : 'Pause'}</button>}
        />
      </Player.Container>
    </Player.Provider>
  );
}

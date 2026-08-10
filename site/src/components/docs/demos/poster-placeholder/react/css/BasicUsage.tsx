import { createPlayer, PlayButton, Poster, PosterPlaceholder } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

const Player = createPlayer({ features: videoFeatures });

export default function BasicUsage() {
  return (
    <Player.Provider poster="{{VJS10_DEMO_POSTER}}" posterPlaceholder="{{VJS10_DEMO_POSTER_PLACEHOLDER}}">
      <Player.Container className="media-container">
        <Video src="{{VJS10_DEMO_VIDEO_MP4}}" playsInline />

        <PosterPlaceholder className="media-poster-placeholder" />

        <Poster className="media-poster" />

        <PlayButton
          className="media-play-button"
          render={(props, state) => <button {...props}>{state.paused ? 'Play' : 'Pause'}</button>}
        />
      </Player.Container>
    </Player.Provider>
  );
}

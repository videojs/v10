import { createPlayer, Thumbnail } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

const Player = createPlayer({ features: videoFeatures });

export default function TextTrackUsage() {
  return (
    <Player.Provider>
      <Player.Container className="demo">
        <Video
          className="media"
          src="{{VJS10_DEMO_VIDEO_MP4}}"
          preload="auto"
          muted
          playsInline
          crossOrigin="anonymous"
        >
          <track kind="metadata" label="thumbnails" src="/docs/demos/thumbnail/basic.vtt" default />
        </Video>
        <Thumbnail className="media-thumbnail" time={12} />
      </Player.Container>
    </Player.Provider>
  );
}

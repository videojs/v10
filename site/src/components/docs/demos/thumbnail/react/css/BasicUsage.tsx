import { createPlayer, Thumbnail } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

const Player = createPlayer({ features: videoFeatures });

export default function TextTrackUsage() {
  return (
    <Player.Provider>
      <Player.Container className="demo">
        <Video
          className="media"
          src="https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/highest.mp4"
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

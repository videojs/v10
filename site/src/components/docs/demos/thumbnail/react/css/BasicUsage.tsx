import { createPlayer, Thumbnail } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

import './BasicUsage.css';

const Player = createPlayer({ features: videoFeatures });

export default function TextTrackUsage() {
  return (
    <Player.Provider>
      <Player.Container className="react-thumbnail-text-track">
        <Video
          className="react-thumbnail-text-track__media"
          src="https://stream.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/highest.mp4"
          preload="auto"
          muted
          playsInline
          crossOrigin="anonymous"
        >
          <track kind="metadata" label="thumbnails" src="/docs/demos/thumbnail/basic.vtt" default />
        </Video>
        <Thumbnail className="react-thumbnail-text-track__thumbnail" time={12} />
      </Player.Container>
    </Player.Provider>
  );
}

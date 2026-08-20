import { Container, createPlayer, Thumbnail } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

const { Player } = createPlayer({ features: videoFeatures });

export default function TextTrackUsage() {
  return (
    <Player>
      <Container className="relative max-w-70">
        <Video
          className="pointer-events-none absolute h-px w-px opacity-0"
          src="{{VJS10_DEMO_VIDEO_MP4}}"
          preload="auto"
          muted
          playsInline
          crossOrigin="anonymous"
        >
          <track kind="metadata" label="thumbnails" src="/docs/demos/thumbnail/basic.vtt" default />
        </Video>
        <Thumbnail className="block w-auto min-w-0 max-w-60 data-hidden:hidden" time={12} />
      </Container>
    </Player>
  );
}

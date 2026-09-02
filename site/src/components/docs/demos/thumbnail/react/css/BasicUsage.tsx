import { Container, createPlayer, Thumbnail } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

const { Player } = createPlayer({ features: videoFeatures });

export default function TextTrackUsage() {
  return (
    <Player>
      <Container className="demo">
        <Video
          className="media"
          src="{{VJS10_DEMO_VIDEO_MP4}}"
          preload="auto"
          muted
          playsInline
          crossOrigin="anonymous"
        >
          <track kind="metadata" label="thumbnails" src="{{VJS10_DEMO_STORYBOARD_VTT}}" default />
        </Video>
        <Thumbnail.Root className="media-thumbnail" time={12}>
          <Thumbnail.Image className="media-thumbnail-image" />
        </Thumbnail.Root>
      </Container>
    </Player>
  );
}

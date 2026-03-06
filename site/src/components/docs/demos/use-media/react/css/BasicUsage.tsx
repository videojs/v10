import { createPlayer, useMedia } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

import './BasicUsage.css';

const { Provider, Container } = createPlayer({
  features: videoFeatures,
});

function MediaInfo() {
  const media = useMedia();

  if (!media) return null;

  return (
    <dl className="react-use-media-basic__info">
      <div>
        <dt>tagName</dt>
        <dd>{media.tagName.toLowerCase()}</dd>
      </div>
      <div>
        <dt>src</dt>
        <dd>{media.currentSrc || '—'}</dd>
      </div>
      <div>
        <dt>videoWidth</dt>
        <dd>{media.videoWidth}px</dd>
      </div>
      <div>
        <dt>videoHeight</dt>
        <dd>{media.videoHeight}px</dd>
      </div>
    </dl>
  );
}

export default function BasicUsage() {
  return (
    <Provider>
      <Container className="react-use-media-basic">
        <Video
          src="https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/highest.mp4"
          autoPlay
          muted
          playsInline
          loop
        />
        <MediaInfo />
      </Container>
    </Provider>
  );
}

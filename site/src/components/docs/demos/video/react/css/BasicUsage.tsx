import { Container } from '@videojs/react';
import { Video, VideoPlayer } from '@videojs/react/video';

import './BasicUsage.css';

export default function BasicUsage() {
  return (
    <VideoPlayer>
      <Container className="react-video-basic">
        <Video className="react-video-basic__media" controls playsInline preload="metadata">
          <source src="{{VJS10_DEMO_VIDEO_MP4}}" type="video/mp4" />
          <track kind="captions" src="/docs/demos/captions-button/captions.vtt" srcLang="en" label="English" />
        </Video>
      </Container>
    </VideoPlayer>
  );
}

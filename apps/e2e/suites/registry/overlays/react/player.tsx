import { HlsJsVideo } from '@videojs/react/media/hlsjs-video';
import { VideoPlayer } from '@videojs/react/video';

import { VideoSkin } from '@/components/videojs/video/skin';

import { MediaProbe } from './media-probe';

export function Player() {
  return (
    <section data-registry-skin="installed">
      <VideoPlayer>
        <VideoSkin style={{ width: 640, aspectRatio: '16 / 9' }}>
          <HlsJsVideo aria-label="Registry validation video" />
          <MediaProbe />
        </VideoSkin>
      </VideoPlayer>
    </section>
  );
}

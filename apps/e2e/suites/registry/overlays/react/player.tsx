import { HlsJsVideo } from '@videojs/react/media/hlsjs-video';
import { VideoPlayer } from '@videojs/react/video';

import { DefaultVideoSkin } from '@/components/videojs/skins/video/default/skin';
import { MinimalVideoSkin } from '@/components/videojs/skins/video/minimal/skin';

import { MediaProbe } from './media-probe';

export function Player() {
  return (
    <>
      <section data-registry-skin="default">
        <VideoPlayer>
          <DefaultVideoSkin style={{ width: 640, aspectRatio: '16 / 9' }}>
            <HlsJsVideo aria-label="Default registry validation video" />
            <MediaProbe />
          </DefaultVideoSkin>
        </VideoPlayer>
      </section>
      <section data-registry-skin="minimal">
        <VideoPlayer>
          <MinimalVideoSkin style={{ width: 640, aspectRatio: '16 / 9' }}>
            <HlsJsVideo aria-label="Minimal registry validation video" />
            <MediaProbe />
          </MinimalVideoSkin>
        </VideoPlayer>
      </section>
    </>
  );
}

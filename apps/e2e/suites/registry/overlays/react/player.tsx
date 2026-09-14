import { Audio, AudioPlayer } from '@videojs/react/audio';
import { HlsJsVideo } from '@videojs/react/media/hlsjs-video';
import { VideoPlayer } from '@videojs/react/video';

import { AudioSkin } from '@/components/videojs/audio/skin';
import { VideoSkin } from '@/components/videojs/video/skin';

import { MediaProbe } from './media-probe';

export function Player() {
  return (
    <main>
      <section data-registry-skin="video">
        <VideoPlayer>
          <VideoSkin style={{ width: 640, aspectRatio: '16 / 9' }}>
            <HlsJsVideo aria-label="Registry validation video" />
            <MediaProbe />
          </VideoSkin>
        </VideoPlayer>
      </section>
      <section data-registry-skin="audio">
        <AudioPlayer>
          <AudioSkin style={{ width: 640 }}>
            <Audio aria-label="Registry validation audio" />
            <MediaProbe />
          </AudioSkin>
        </AudioPlayer>
      </section>
    </main>
  );
}

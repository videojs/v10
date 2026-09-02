'use client';

import { useMedia } from '@videojs/react';
import { HlsJsVideo } from '@videojs/react/media/hlsjs-video';
import { VideoPlayer } from '@videojs/react/video';

import { MinimalVideoSkin } from '@/components/videojs/skins/video/minimal/skin';
import { DefaultVideoSkin } from '@/components/videojs/skins/video/skin';

function MediaProbe() {
  const media = useMedia();

  return <output data-media-probe data-attached={media ? 'true' : 'false'} />;
}

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

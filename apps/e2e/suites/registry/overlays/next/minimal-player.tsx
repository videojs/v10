'use client';

import { useMedia } from '@videojs/react';
import { HlsJsVideo } from '@videojs/react/media/hlsjs-video';
import { VideoPlayer } from '@videojs/react/video';

import { MinimalVideoSkin as VideoSkin } from '@/components/videojs/skins/video/minimal/skin';

function MediaProbe() {
  const media = useMedia();

  return <output data-testid="media-probe" data-attached={media ? 'true' : 'false'} />;
}

export function Player() {
  return (
    <VideoPlayer>
      <VideoSkin style={{ width: 640, aspectRatio: '16 / 9' }}>
        <HlsJsVideo aria-label="Registry validation video" />
        <MediaProbe />
      </VideoSkin>
    </VideoPlayer>
  );
}

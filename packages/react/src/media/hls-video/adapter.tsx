'use client';

import { HlsVideoAdapter } from '@videojs/spf/hls-video';

import { createMediaComponent, type MediaComponentProps } from '../create-media-component';

export type HlsVideoProps = MediaComponentProps<typeof HlsVideoAdapter>;

export const HlsVideo = createMediaComponent(
  HlsVideoAdapter,
  ({ props, children, ref }) => (
    <video {...props} ref={ref}>
      {children}
    </video>
  ),
  { displayName: 'HlsVideo' }
);

export namespace HlsVideo {
  export type Props = HlsVideoProps;
}

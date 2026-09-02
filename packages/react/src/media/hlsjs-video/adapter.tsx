'use client';

import { HlsJsAdapter } from '@videojs/hlsjs-video';

import { createMediaComponent, type MediaComponentProps } from '../create-media-component';

export type HlsJsVideoProps = MediaComponentProps<typeof HlsJsAdapter>;

export const HlsJsVideo = createMediaComponent(
  HlsJsAdapter,
  ({ props, children, ref }) => (
    <video {...props} ref={ref}>
      {children}
    </video>
  ),
  { displayName: 'HlsJsVideo' }
);

export namespace HlsJsVideo {
  export type Props = HlsJsVideoProps;
}

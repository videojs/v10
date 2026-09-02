'use client';

import { NativeHlsAdapter } from '@videojs/native-hls-video';

import { createMediaComponent, type MediaComponentProps } from '../create-media-component';

export type NativeHlsVideoProps = MediaComponentProps<typeof NativeHlsAdapter>;

export const NativeHlsVideo = createMediaComponent(
  NativeHlsAdapter,
  ({ props, children, ref }) => (
    <video {...props} ref={ref}>
      {children}
    </video>
  ),
  { displayName: 'NativeHlsVideo' }
);

export namespace NativeHlsVideo {
  export type Props = NativeHlsVideoProps;
}

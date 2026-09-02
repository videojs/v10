'use client';

import { ShakaAdapter } from '@videojs/shaka-video';

import { createMediaComponent, type MediaComponentProps } from '../create-media-component';

export type ShakaVideoProps = MediaComponentProps<typeof ShakaAdapter>;

export const ShakaVideo = createMediaComponent(
  ShakaAdapter,
  ({ props, children, ref }) => (
    <video {...props} ref={ref}>
      {children}
    </video>
  ),
  { displayName: 'ShakaVideo' }
);

export namespace ShakaVideo {
  export type Props = ShakaVideoProps;
}

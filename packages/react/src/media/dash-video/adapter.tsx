'use client';

import { DashAdapter } from '@videojs/dash-video';

import { createMediaComponent, type MediaComponentProps } from '../create-media-component';

export type DashVideoProps = MediaComponentProps<typeof DashAdapter>;

export const DashVideo = createMediaComponent(
  DashAdapter,
  ({ props, children, ref }) => (
    <video {...props} ref={ref}>
      {children}
    </video>
  ),
  { displayName: 'DashVideo' }
);

export namespace DashVideo {
  export type Props = DashVideoProps;
}

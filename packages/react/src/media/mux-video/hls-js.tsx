'use client';

import { MuxVideoAdapter } from '@videojs/mux-video';

import { createMediaComponent, type MediaComponentProps } from '../create-media-component';
import { MuxStoryboard } from './storyboard';

export type MuxVideoProps = MediaComponentProps<typeof MuxVideoAdapter>;

export const MuxVideo = createMediaComponent(
  MuxVideoAdapter,
  ({ adapter, props, children, ref }) => {
    return (
      <video ref={ref} {...props}>
        <MuxStoryboard media={adapter} />
        {children}
      </video>
    );
  },
  { displayName: 'MuxVideo' }
);

export namespace MuxVideo {
  export type Props = MuxVideoProps;
}

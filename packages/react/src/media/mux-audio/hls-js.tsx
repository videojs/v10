'use client';

import { MuxAudioAdapter } from '@videojs/mux-audio';

import { createMediaComponent, type MediaComponentProps } from '../create-media-component';

export type MuxAudioProps = MediaComponentProps<typeof MuxAudioAdapter>;

export const MuxAudio = createMediaComponent(
  MuxAudioAdapter,
  ({ props, children, ref }) => {
    return (
      <audio ref={ref} {...props}>
        {children}
      </audio>
    );
  },
  { displayName: 'MuxAudio' }
);

export namespace MuxAudio {
  export type Props = MuxAudioProps;
}

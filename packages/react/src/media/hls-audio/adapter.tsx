'use client';

import { HlsAudioAdapter } from '@videojs/spf/hls-audio';

import { createMediaComponent, type MediaComponentProps } from '../create-media-component';

export type HlsAudioProps = MediaComponentProps<typeof HlsAudioAdapter>;

export const HlsAudio = createMediaComponent(
  HlsAudioAdapter,
  ({ props, children, ref }) => (
    <audio {...props} ref={ref}>
      {children}
    </audio>
  ),
  { displayName: 'HlsAudio' }
);

export namespace HlsAudio {
  export type Props = HlsAudioProps;
}

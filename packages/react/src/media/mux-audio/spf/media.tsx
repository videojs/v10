'use client';

import type { MuxMediaProps } from '@videojs/spf/mux-audio-only';
import { MuxAudioOnlyMedia, muxMediaDefaultProps } from '@videojs/spf/mux-audio-only';
import type { SimpleHlsAudioOnlyMediaProps } from '@videojs/spf/simple-hls-audio-only';
import { simpleHlsAudioOnlyMediaDefaultProps } from '@videojs/spf/simple-hls-audio-only';
import type { AudioHTMLAttributes, ReactNode } from 'react';
import { forwardRef } from 'react';
import { useAttachMedia } from '../../../utils/use-attach-media';
import { useComposedRefs } from '../../../utils/use-composed-refs';
import { useMediaInstance } from '../../../utils/use-media-instance';
import { useSyncProps } from '../../../utils/use-sync-props';

// `src` and `source` come from `MuxMediaProps`: the Mux Media owns both, and its
// `source` is the structured Mux one rather than the generic engine's.
export interface MuxAudioProps
  extends Omit<AudioHTMLAttributes<HTMLAudioElement>, keyof SimpleHlsAudioOnlyMediaProps | keyof MuxMediaProps>,
    Partial<Omit<SimpleHlsAudioOnlyMediaProps, 'src'>>,
    Partial<MuxMediaProps> {
  children?: ReactNode;
}

const muxAudioDefaultProps: Omit<SimpleHlsAudioOnlyMediaProps, 'src'> & MuxMediaProps = {
  ...simpleHlsAudioOnlyMediaDefaultProps,
  ...muxMediaDefaultProps,
};

export const MuxAudio = forwardRef<HTMLAudioElement, MuxAudioProps>(function MuxAudio({ children, ...props }, ref) {
  const media = useMediaInstance(MuxAudioOnlyMedia);
  const attachRef = useAttachMedia(media);
  const composedRef = useComposedRefs(attachRef, ref);
  const htmlProps = useSyncProps(media, props, muxAudioDefaultProps);

  return (
    <audio ref={composedRef} {...htmlProps}>
      {children}
    </audio>
  );
});

export namespace MuxAudio {
  export type Props = MuxAudioProps;
}

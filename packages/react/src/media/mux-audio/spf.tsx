'use client';

import type { HlsAudioMediaProps } from '@videojs/spf/hls-audio';
import { hlsAudioMediaDefaultProps } from '@videojs/spf/hls-audio';
import type { MuxMediaProps } from '@videojs/spf/mux-audio';
import { MuxAudioMedia, muxMediaDefaultProps } from '@videojs/spf/mux-audio';
import type { AudioHTMLAttributes, ReactNode } from 'react';
import { forwardRef } from 'react';

import { useAttachMedia } from '../../utils/use-attach-media';
import { useComposedRefs } from '../../utils/use-composed-refs';
import { useMediaInstance } from '../../utils/use-media-instance';
import { useSyncProps } from '../../utils/use-sync-props';

// `src` and `source` come from `MuxMediaProps`: the Mux Media owns both, and its
// `source` is the structured Mux one rather than the generic engine's.
export interface MuxAudioProps
  extends
    Omit<AudioHTMLAttributes<HTMLAudioElement>, keyof HlsAudioMediaProps | keyof MuxMediaProps>,
    Partial<Omit<HlsAudioMediaProps, 'src'>>,
    Partial<MuxMediaProps> {
  children?: ReactNode;
}

const muxAudioDefaultProps: Omit<HlsAudioMediaProps, 'src'> & MuxMediaProps = {
  ...hlsAudioMediaDefaultProps,
  ...muxMediaDefaultProps,
};

export const MuxAudio = forwardRef<HTMLAudioElement, MuxAudioProps>(function MuxAudio({ children, ...props }, ref) {
  const media = useMediaInstance(MuxAudioMedia);
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

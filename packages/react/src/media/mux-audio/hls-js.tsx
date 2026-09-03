'use client';

import { hlsMediaDefaultProps, type HlsMediaProps } from '@videojs/hlsjs-video';
import { MuxAudioMedia, muxMediaDefaultProps, type MuxAudioMediaProps } from '@videojs/mux-audio';
import { type AudioHTMLAttributes, forwardRef, type ReactNode } from 'react';

import { useAttachMedia } from '../../utils/use-attach-media';
import { useComposedRefs } from '../../utils/use-composed-refs';
import { useMediaInstance } from '../../utils/use-media-instance';
import { useSyncProps } from '../../utils/use-sync-props';

// `source` comes from `MuxAudioMediaProps` only: `MuxSource` extends `HlsSource` with
// Mux identity fields, so the narrower type has to win.
export interface MuxAudioProps
  extends
    Omit<AudioHTMLAttributes<HTMLAudioElement>, keyof HlsMediaProps | keyof MuxAudioMediaProps>,
    Partial<Omit<HlsMediaProps, 'source'>>,
    Partial<MuxAudioMediaProps> {
  children?: ReactNode;
}

const muxAudioDefaultProps: Omit<HlsMediaProps, 'source'> & MuxAudioMediaProps = {
  ...hlsMediaDefaultProps,
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

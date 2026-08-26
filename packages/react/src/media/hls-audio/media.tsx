'use client';

import type { HlsAudioMediaProps } from '@videojs/spf/hls-audio';
import { HlsAudioMedia, hlsAudioMediaDefaultProps } from '@videojs/spf/hls-audio';
import type { AudioHTMLAttributes, ReactNode } from 'react';
import { forwardRef } from 'react';

import { useAttachMedia } from '../../utils/use-attach-media';
import { useComposedRefs } from '../../utils/use-composed-refs';
import { useMediaInstance } from '../../utils/use-media-instance';
import { useSyncProps } from '../../utils/use-sync-props';

export interface HlsAudioProps
  extends Omit<AudioHTMLAttributes<HTMLAudioElement>, keyof HlsAudioMediaProps>, Partial<HlsAudioMediaProps> {
  children?: ReactNode;
}

export const HlsAudio = forwardRef<HTMLAudioElement, HlsAudioProps>(function HlsAudio({ children, ...props }, ref) {
  const media = useMediaInstance(HlsAudioMedia);
  const attachRef = useAttachMedia(media);
  const composedRef = useComposedRefs(attachRef, ref);
  const htmlProps = useSyncProps(media, props, hlsAudioMediaDefaultProps);

  return (
    <audio ref={composedRef} {...htmlProps}>
      {children}
    </audio>
  );
});

export namespace HlsAudio {
  export type Props = HlsAudioProps;
}

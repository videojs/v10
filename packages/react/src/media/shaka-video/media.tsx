'use client';

import type { ShakaMediaProps } from '@videojs/media/dom/shaka';
import { ShakaMedia, shakaMediaDefaultProps } from '@videojs/media/dom/shaka';
import type { ReactNode, VideoHTMLAttributes } from 'react';
import { forwardRef } from 'react';

import { useAttachMedia } from '../../utils/use-attach-media';
import { useComposedRefs } from '../../utils/use-composed-refs';
import { useMediaInstance } from '../../utils/use-media-instance';
import { useSyncProps } from '../../utils/use-sync-props';

export interface ShakaVideoProps
  extends Omit<VideoHTMLAttributes<HTMLVideoElement>, keyof ShakaMediaProps>, Partial<ShakaMediaProps> {
  children?: ReactNode;
}

export const ShakaVideo = forwardRef<HTMLVideoElement, ShakaVideoProps>(function ShakaVideo(
  { children, ...props },
  ref
) {
  const media = useMediaInstance(ShakaMedia);
  const attachRef = useAttachMedia(media);
  const composedRef = useComposedRefs(attachRef, ref);
  const htmlProps = useSyncProps(media, props, shakaMediaDefaultProps);

  return (
    <video ref={composedRef} {...htmlProps}>
      {children}
    </video>
  );
});

export namespace ShakaVideo {
  export type Props = ShakaVideoProps;
}

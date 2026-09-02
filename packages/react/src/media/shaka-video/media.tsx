'use client';

import { ShakaMedia, shakaMediaDefaultProps, type ShakaMediaProps } from '@videojs/shaka-video';
import { forwardRef, type ReactNode, type VideoHTMLAttributes } from 'react';

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

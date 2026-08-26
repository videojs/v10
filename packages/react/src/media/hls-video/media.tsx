'use client';

import type { HlsVideoMediaProps } from '@videojs/spf/hls-video';
import { HlsVideoMedia, hlsVideoMediaDefaultProps } from '@videojs/spf/hls-video';
import type { ReactNode, VideoHTMLAttributes } from 'react';
import { forwardRef } from 'react';

import { useAttachMedia } from '../../utils/use-attach-media';
import { useComposedRefs } from '../../utils/use-composed-refs';
import { useMediaInstance } from '../../utils/use-media-instance';
import { useSyncProps } from '../../utils/use-sync-props';

export interface HlsVideoProps
  extends Omit<VideoHTMLAttributes<HTMLVideoElement>, keyof HlsVideoMediaProps>, Partial<HlsVideoMediaProps> {
  children?: ReactNode;
}

export const HlsVideo = forwardRef<HTMLVideoElement, HlsVideoProps>(function HlsVideo({ children, ...props }, ref) {
  const media = useMediaInstance(HlsVideoMedia);
  const attachRef = useAttachMedia(media);
  const composedRef = useComposedRefs(attachRef, ref);
  const htmlProps = useSyncProps(media, props, hlsVideoMediaDefaultProps);

  return (
    <video ref={composedRef} {...htmlProps}>
      {children}
    </video>
  );
});

export namespace HlsVideo {
  export type Props = HlsVideoProps;
}

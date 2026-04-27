'use client';

import type { HlsMediaProps } from '@videojs/core/dom/media/hls';
import { HlsMedia, hlsMediaDefaultProps } from '@videojs/core/dom/media/hls';
import type { ReactNode, VideoHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { useAttachMedia } from '../../utils/use-attach-media';
import { useComposedRefs } from '../../utils/use-composed-refs';
import { useMediaInstance } from '../../utils/use-media-instance';
import { useSyncProps } from '../../utils/use-sync-props';

export interface HlsVideoProps
  extends Omit<VideoHTMLAttributes<HTMLVideoElement>, keyof HlsMediaProps>,
    Partial<HlsMediaProps> {
  children?: ReactNode;
}

export const HlsVideo = forwardRef<HTMLVideoElement, HlsVideoProps>(function HlsVideo({ children, ...props }, ref) {
  const media = useMediaInstance(HlsMedia);
  const attachRef = useAttachMedia(media);
  const composedRef = useComposedRefs(attachRef, ref);
  const htmlProps = useSyncProps(media, props, hlsMediaDefaultProps);

  return (
    <video ref={composedRef} {...htmlProps}>
      {children}
    </video>
  );
});

export namespace HlsVideo {
  export type Props = HlsVideoProps;
}

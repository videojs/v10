'use client';

import type { HlsMediaProps } from '@videojs/media/dom/hls-js';
import { HlsJsMedia, hlsMediaDefaultProps } from '@videojs/media/dom/hls-js';
import type { ReactNode, VideoHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { useAttachMedia } from '../../utils/use-attach-media';
import { useComposedRefs } from '../../utils/use-composed-refs';
import { useMediaInstance } from '../../utils/use-media-instance';
import { useSyncProps } from '../../utils/use-sync-props';

export interface HlsJsVideoProps
  extends Omit<VideoHTMLAttributes<HTMLVideoElement>, keyof HlsMediaProps>,
    Partial<HlsMediaProps> {
  children?: ReactNode;
}

export const HlsJsVideo = forwardRef<HTMLVideoElement, HlsJsVideoProps>(function HlsJsVideo(
  { children, ...props },
  ref
) {
  const media = useMediaInstance(HlsJsMedia);
  const attachRef = useAttachMedia(media);
  const composedRef = useComposedRefs(attachRef, ref);
  const htmlProps = useSyncProps(media, props, hlsMediaDefaultProps);

  return (
    <video ref={composedRef} {...htmlProps}>
      {children}
    </video>
  );
});

export namespace HlsJsVideo {
  export type Props = HlsJsVideoProps;
}

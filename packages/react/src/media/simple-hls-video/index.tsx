'use client';

import { SimpleHlsMedia } from '@videojs/core/dom/media/simple-hls';
import type { ReactNode, VideoHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { useAttachMedia } from '../../utils/use-attach-media';
import { useComposedRefs } from '../../utils/use-composed-refs';
import { useMediaInstance } from '../../utils/use-media-instance';

interface SimpleHlsMediaProps extends Partial<Pick<SimpleHlsMedia, 'src' | 'preload'>> {}

export interface SimpleHlsVideoProps
  extends Omit<VideoHTMLAttributes<HTMLVideoElement>, keyof SimpleHlsMediaProps>,
    SimpleHlsMediaProps {
  children?: ReactNode;
}

export const SimpleHlsVideo = forwardRef<HTMLVideoElement, SimpleHlsVideoProps>(function SimpleHlsVideo(
  { children, src, preload, ...htmlProps },
  ref
) {
  const media = useMediaInstance(SimpleHlsMedia);
  const attachRef = useAttachMedia(media);
  const composedRef = useComposedRefs(attachRef, ref);

  if (src !== undefined && media.src !== src) media.src = src;
  if (preload !== undefined && media.preload !== preload) media.preload = preload;

  return (
    <video ref={composedRef} {...htmlProps}>
      {children}
    </video>
  );
});

export namespace SimpleHlsVideo {
  export type Props = SimpleHlsVideoProps;
}

'use client';

import { NativeHlsMedia } from '@videojs/core/dom/media/native-hls';
import type { ReactNode, VideoHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { useAttachMedia } from '../../utils/use-attach-media';
import { useComposedRefs } from '../../utils/use-composed-refs';
import { useMediaInstance } from '../../utils/use-media-instance';

interface NativeHlsMediaProps extends Partial<Pick<NativeHlsMedia, 'src' | 'preload'>> {}

export interface NativeHlsVideoProps
  extends Omit<VideoHTMLAttributes<HTMLVideoElement>, keyof NativeHlsMediaProps>,
    NativeHlsMediaProps {
  children?: ReactNode;
}

export const NativeHlsVideo = forwardRef<HTMLVideoElement, NativeHlsVideoProps>(function NativeHlsVideo(
  { children, src, preload, ...htmlProps },
  ref
) {
  const media = useMediaInstance(NativeHlsMedia);
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

export namespace NativeHlsVideo {
  export type Props = NativeHlsVideoProps;
}

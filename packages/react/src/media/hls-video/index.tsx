'use client';

import { HlsMedia } from '@videojs/core/dom/media/hls';
import type { ReactNode, VideoHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { useAttachMedia } from '../../utils/use-attach-media';
import { useComposedRefs } from '../../utils/use-composed-refs';
import { useMediaInstance } from '../../utils/use-media-instance';

interface HlsMediaProps
  extends Partial<Pick<HlsMedia, 'src' | 'type' | 'preferPlayback' | 'config' | 'debug' | 'preload'>> {}

export interface HlsVideoProps extends Omit<VideoHTMLAttributes<HTMLVideoElement>, keyof HlsMediaProps>, HlsMediaProps {
  children?: ReactNode;
}

export const HlsVideo = forwardRef<HTMLVideoElement, HlsVideoProps>(function HlsVideo(
  { children, src, type, preferPlayback, config, debug, preload, ...htmlProps },
  ref
) {
  const media = useMediaInstance(HlsMedia);
  const attachRef = useAttachMedia(media);
  const composedRef = useComposedRefs(attachRef, ref);

  if (src !== undefined && media.src !== src) media.src = src;
  if (media.type !== type) media.type = type;
  if (media.preferPlayback !== preferPlayback) media.preferPlayback = preferPlayback;
  if (config !== undefined && media.config !== config) media.config = config;
  if (debug !== undefined && media.debug !== debug) media.debug = debug;
  if (preload !== undefined && media.preload !== preload) media.preload = preload;

  return (
    <video ref={composedRef} {...htmlProps}>
      {children}
    </video>
  );
});

export namespace HlsVideo {
  export type Props = HlsVideoProps;
}

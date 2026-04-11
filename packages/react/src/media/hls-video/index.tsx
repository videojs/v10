'use client';

import { HlsMedia } from '@videojs/core/dom/media/hls';
import type { InferClassProps } from '@videojs/utils/types';
import type { PropsWithChildren, VideoHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { attachMediaElement } from '../../utils/attach-media-element';
import { mediaProps } from '../../utils/media-props';
import { useComposedRefs } from '../../utils/use-composed-refs';
import { useMediaInstance } from '../../utils/use-media-instance';

export type HlsVideoProps = PropsWithChildren<VideoHTMLAttributes<HTMLVideoElement>> & InferClassProps<typeof HlsMedia>;

export const HlsVideo = forwardRef<HTMLVideoElement, HlsVideoProps>(function HlsVideo({ children, ...props }, ref) {
  const mediaApi = useMediaInstance(HlsMedia);

  const composedRef = useComposedRefs(attachMediaElement(mediaApi), ref);

  return (
    <video ref={composedRef} {...mediaProps(mediaApi, HlsMedia, props)}>
      {children}
    </video>
  );
});

export namespace HlsVideo {
  export type Props = HlsVideoProps;
}

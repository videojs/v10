'use client';

import { NativeHlsMedia } from '@videojs/core/dom/media/native-hls';
import type { InferClassProps } from '@videojs/utils/types';
import type { PropsWithChildren, VideoHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { attachMediaElement } from '../../utils/attach-media-element';
import { mediaProps } from '../../utils/media-props';
import { useComposedRefs } from '../../utils/use-composed-refs';
import { useMediaInstance } from '../../utils/use-media-instance';

export type NativeHlsVideoProps = PropsWithChildren<VideoHTMLAttributes<HTMLVideoElement>> &
  InferClassProps<typeof NativeHlsMedia>;

export const NativeHlsVideo = forwardRef<HTMLVideoElement, NativeHlsVideoProps>(function NativeHlsVideo(
  { children, ...props },
  ref
) {
  const mediaApi = useMediaInstance(NativeHlsMedia);

  const composedRef = useComposedRefs(attachMediaElement(mediaApi), ref);

  return (
    <video ref={composedRef} {...mediaProps(mediaApi, NativeHlsMedia, props)}>
      {children}
    </video>
  );
});

export namespace NativeHlsVideo {
  export type Props = NativeHlsVideoProps;
}

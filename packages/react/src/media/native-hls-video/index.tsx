import type { InferDelegateProps } from '@videojs/core';
import { NativeHlsMedia, NativeHlsMediaDelegate } from '@videojs/core/dom/media/native-hls';
import type { PropsWithChildren, VideoHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { attachMediaElement } from '../../utils/attach-media-element';
import { mediaProps } from '../../utils/media-props';
import { useComposedRefs } from '../../utils/use-composed-refs';
import { useMediaInstance } from '../../utils/use-media-instance';

export type NativeHlsVideoProps = PropsWithChildren<VideoHTMLAttributes<HTMLVideoElement>> &
  InferDelegateProps<typeof NativeHlsMediaDelegate>;

export const NativeHlsVideo = forwardRef<HTMLVideoElement, NativeHlsVideoProps>(({ children, ...props }, ref) => {
  const mediaApi = useMediaInstance(NativeHlsMedia);

  const composedRef = useComposedRefs(attachMediaElement(mediaApi), ref);

  return (
    <video ref={composedRef} {...mediaProps(mediaApi, NativeHlsMediaDelegate, props)}>
      {children}
    </video>
  );
});

export default NativeHlsVideo;

import { HlsMedia } from '@videojs/core/dom/media/hls';
import type { PropsWithChildren, VideoHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { attachMediaElement } from '../../utils/attach-media-element';
import { mediaProps } from '../../utils/media-props';
import { useComposedRefs } from '../../utils/use-composed-refs';
import { useMediaInstance } from '../../utils/use-media-instance';

export type HlsVideoProps = PropsWithChildren<VideoHTMLAttributes<HTMLVideoElement>>;

export const HlsVideo = forwardRef<HTMLVideoElement, HlsVideoProps>(({ children, ...props }, ref) => {
  const mediaApi = useMediaInstance(HlsMedia);

  const composedRef = useComposedRefs(attachMediaElement(mediaApi), ref);

  return (
    <video ref={composedRef} {...mediaProps(mediaApi, props)}>
      {children}
    </video>
  );
});

export default HlsVideo;

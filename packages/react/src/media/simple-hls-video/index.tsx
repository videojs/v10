import { SimpleHlsMedia } from '@videojs/core/dom/media/simple-hls';
import { SpfMedia } from '@videojs/spf/dom';
import type { PropsWithChildren, VideoHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { attachMediaElement } from '../../utils/attach-media-element';
import { mediaProps } from '../../utils/media-props';
import { useComposedRefs } from '../../utils/use-composed-refs';
import { useMediaInstance } from '../../utils/use-media-instance';

export type SimpleHlsVideoProps = PropsWithChildren<VideoHTMLAttributes<HTMLVideoElement>>;

export const SimpleHlsVideo = forwardRef<HTMLVideoElement, SimpleHlsVideoProps>(({ children, ...props }, ref) => {
  const mediaApi = useMediaInstance(SimpleHlsMedia);

  const composedRef = useComposedRefs(attachMediaElement(mediaApi), ref);

  return (
    <video ref={composedRef} {...mediaProps(mediaApi, SpfMedia, props)}>
      {children}
    </video>
  );
});

export default SimpleHlsVideo;

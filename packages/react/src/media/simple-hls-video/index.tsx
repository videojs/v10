import { SimpleHlsMedia } from '@videojs/core/dom/media/simple-hls';
import type { PropsWithChildren, VideoHTMLAttributes } from 'react';
import { forwardRef, useState } from 'react';
import { attachMediaElement } from '../../utils/attach-media-element';
import { mediaProps } from '../../utils/media-props';
import { useComposedRefs } from '../../utils/use-composed-refs';
import { useMediaInstance } from '../../utils/use-media-instance';

// TODO: mediaProps uses media.preload which SimpleHlsMedia does not yet expose.
// Add preload getter/setter to SimpleHlsMedia as a follow-up.
export type SimpleHlsVideoProps = PropsWithChildren<VideoHTMLAttributes<HTMLVideoElement>>;

export const SimpleHlsVideo = forwardRef<HTMLVideoElement, SimpleHlsVideoProps>(({ children, ...props }, ref) => {
  const [mediaApi] = useState(() => new SimpleHlsMedia());

  useMediaInstance(mediaApi);

  const composedRef = useComposedRefs(attachMediaElement(mediaApi), ref);

  return (
    <video ref={composedRef} {...mediaProps(mediaApi, props)}>
      {children}
    </video>
  );
});

export default SimpleHlsVideo;

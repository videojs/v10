import { SimpleHlsMedia } from '@videojs/core/dom/media/simple-hls';
import type { PropsWithChildren, VideoHTMLAttributes } from 'react';
import { forwardRef, useEffect, useMemo } from 'react';
import { useMediaAttach } from '../../player/context';
import { attachMediaElement } from '../../utils/attach-media-element';
import { mediaProps } from '../../utils/media-props';
import { useComposedRefs } from '../../utils/use-composed-refs';

export type SimpleHlsVideoProps = PropsWithChildren<VideoHTMLAttributes<HTMLVideoElement>>;

export const SimpleHlsVideo = forwardRef<HTMLVideoElement, SimpleHlsVideoProps>(({ children, ...props }, ref) => {
  const mediaApi = useMemo(() => new SimpleHlsMedia(), []);
  const setMedia = useMediaAttach();

  useEffect(() => {
    setMedia?.(mediaApi);
  }, [mediaApi, setMedia]);

  const composedRef = useComposedRefs(attachMediaElement(mediaApi), ref);

  return (
    <video ref={composedRef} {...mediaProps(mediaApi, props)}>
      {children}
    </video>
  );
});

export default SimpleHlsVideo;

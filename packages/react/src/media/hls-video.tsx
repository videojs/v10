import { HlsMedia } from '@videojs/core/dom/media/hls';
import type { PropsWithChildren, VideoHTMLAttributes } from 'react';
import { forwardRef, useEffect, useMemo } from 'react';
import { useMediaRegistration } from '../player/context';
import { attachMediaElement } from '../utils/attach-media-element';
import { mediaProps } from '../utils/media-props';
import { useComposedRefs } from '../utils/use-composed-refs';

export type HlsVideoProps = PropsWithChildren<VideoHTMLAttributes<HTMLVideoElement>>;

export const HlsVideo = forwardRef<HTMLVideoElement, HlsVideoProps>(({ children, ...props }, ref) => {
  const mediaApi = useMemo(() => new HlsMedia(), []);
  const setMedia = useMediaRegistration();

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

export default HlsVideo;

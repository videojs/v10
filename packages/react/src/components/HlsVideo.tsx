import { HlsMedia } from '@videojs/core/media';
import { useMedia } from '@videojs/store/react';
import type { PropsWithChildren, VideoHTMLAttributes } from 'react';
import { forwardRef, useMemo } from 'react';
import { attachMediaElement, mediaProps } from '../media';
import { useComposedRefs } from '../utils';

export type VideoProps = PropsWithChildren<VideoHTMLAttributes<HTMLVideoElement>>;

export const HlsVideo = forwardRef<HTMLVideoElement, VideoProps>(({ children, ...props }, ref) => {
  const mediaApi = useMedia(useMemo(() => new HlsMedia(), []));
  const composedRef = useComposedRefs(attachMediaElement(mediaApi), ref);
  return (
    <video ref={composedRef} {...mediaProps(mediaApi, props)}>
      {children}
    </video>
  );
});

export default HlsVideo;

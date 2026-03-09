import { SpfMedia } from '@videojs/core/dom/media/spf';
import type { PropsWithChildren, VideoHTMLAttributes } from 'react';
import { forwardRef, useEffect, useMemo } from 'react';
import { useMediaRegistration } from '../../player/context';
import { attachMediaElement } from '../../utils/attach-media-element';
import { mediaProps } from '../../utils/media-props';
import { useComposedRefs } from '../../utils/use-composed-refs';

// TODO: mediaProps uses media.preload which SpfMedia does not yet expose.
// Add preload getter/setter to SpfMedia as a follow-up.
export type SpfVideoProps = PropsWithChildren<VideoHTMLAttributes<HTMLVideoElement>>;

export const SpfVideo = forwardRef<HTMLVideoElement, SpfVideoProps>(({ children, ...props }, ref) => {
  const mediaApi = useMemo(() => new SpfMedia(), []);
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

export default SpfVideo;

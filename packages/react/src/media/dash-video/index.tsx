import { DashMedia } from '@videojs/core/dom/media/dash';
import type { PropsWithChildren, VideoHTMLAttributes } from 'react';
import { forwardRef, useMemo } from 'react';
import { useMediaAttach } from '../../player/context';
import { attachMediaElement } from '../../utils/attach-media-element';
import { mediaProps } from '../../utils/media-props';
import { useComposedRefs } from '../../utils/use-composed-refs';
import { useDestroy } from '../../utils/use-destroy';

export type DashVideoProps = PropsWithChildren<VideoHTMLAttributes<HTMLVideoElement>>;

export const DashVideo = forwardRef<HTMLVideoElement, DashVideoProps>(({ children, ...props }, ref) => {
  const mediaApi = useMemo(() => new DashMedia(), []);
  const setMedia = useMediaAttach();

  useDestroy(mediaApi, () => {
    setMedia?.(mediaApi);
  });

  const composedRef = useComposedRefs(attachMediaElement(mediaApi), ref);
  return (
    <video ref={composedRef} {...mediaProps(mediaApi, props)}>
      {children}
    </video>
  );
});

export default DashVideo;

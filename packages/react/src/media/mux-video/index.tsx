import { MuxMedia } from '@videojs/core/dom/media/mux';
import type { PropsWithChildren, VideoHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { attachMediaElement } from '../../utils/attach-media-element';
import { mediaProps } from '../../utils/media-props';
import { useComposedRefs } from '../../utils/use-composed-refs';
import { useMediaInstance } from '../../utils/use-media-instance';

export type MuxVideoProps = PropsWithChildren<VideoHTMLAttributes<HTMLVideoElement>>;

export const MuxVideo = forwardRef<HTMLVideoElement, MuxVideoProps>(({ children, ...props }, ref) => {
  const mediaApi = useMediaInstance(MuxMedia);
  const composedRef = useComposedRefs(attachMediaElement(mediaApi), ref);

  return (
    <video ref={composedRef} {...mediaProps(mediaApi, props)}>
      {children}
    </video>
  );
});

export default MuxVideo;

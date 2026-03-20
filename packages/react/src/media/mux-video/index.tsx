import type { InferDelegateProps } from '@videojs/core';
import { HlsMediaDelegate } from '@videojs/core/dom/media/hls';
import { MuxMedia } from '@videojs/core/dom/media/mux';
import type { PropsWithChildren, VideoHTMLAttributes } from 'react';
import { forwardRef, useMemo } from 'react';
import { useMediaAttach } from '../../player/context';
import { attachMediaElement } from '../../utils/attach-media-element';
import { mediaProps } from '../../utils/media-props';
import { useComposedRefs } from '../../utils/use-composed-refs';
import { useDestroy } from '../../utils/use-destroy';

export type MuxVideoProps = PropsWithChildren<VideoHTMLAttributes<HTMLVideoElement>> &
  InferDelegateProps<typeof HlsMediaDelegate>;

export const MuxVideo = forwardRef<HTMLVideoElement, MuxVideoProps>(({ children, ...props }, ref) => {
  const mediaApi = useMemo(() => new MuxMedia(), []);
  const setMedia = useMediaAttach();

  useDestroy(mediaApi, () => {
    setMedia?.(mediaApi);
  });

  const composedRef = useComposedRefs(attachMediaElement(mediaApi), ref);

  return (
    <video ref={composedRef} {...mediaProps(mediaApi, HlsMediaDelegate, props)}>
      {children}
    </video>
  );
});

export default MuxVideo;

'use client';

import { MuxVideoMedia } from '@videojs/core/dom/media/mux';
import type { InferClassProps } from '@videojs/utils/types';
import type { PropsWithChildren, VideoHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { attachMediaElement } from '../../utils/attach-media-element';
import { mediaProps } from '../../utils/media-props';
import { useComposedRefs } from '../../utils/use-composed-refs';
import { useMediaInstance } from '../../utils/use-media-instance';

export type MuxVideoProps = PropsWithChildren<VideoHTMLAttributes<HTMLVideoElement>> &
  InferClassProps<typeof MuxVideoMedia>;

export const MuxVideo = forwardRef<HTMLVideoElement, MuxVideoProps>(function MuxVideo({ children, ...props }, ref) {
  const mediaApi = useMediaInstance(MuxVideoMedia);

  const composedRef = useComposedRefs(attachMediaElement(mediaApi), ref);

  return (
    <video ref={composedRef} {...mediaProps(mediaApi, MuxVideoMedia, props)}>
      {children}
    </video>
  );
});

export namespace MuxVideo {
  export type Props = MuxVideoProps;
}

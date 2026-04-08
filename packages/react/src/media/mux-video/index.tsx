'use client';

import type { InferClassProps } from '@videojs/core';
import { MuxVideo as MuxVideoApi, MuxVideoBase } from '@videojs/core/dom/media/mux';
import type { PropsWithChildren, VideoHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { attachMediaElement } from '../../utils/attach-media-element';
import { mediaProps } from '../../utils/media-props';
import { useComposedRefs } from '../../utils/use-composed-refs';
import { useMediaInstance } from '../../utils/use-media-instance';

export type MuxVideoProps = PropsWithChildren<VideoHTMLAttributes<HTMLVideoElement>> &
  InferClassProps<typeof MuxVideoBase>;

export const MuxVideo = forwardRef<HTMLVideoElement, MuxVideoProps>(function MuxVideo({ children, ...props }, ref) {
  const mediaApi = useMediaInstance(MuxVideoApi);

  const composedRef = useComposedRefs(attachMediaElement(mediaApi), ref);

  return (
    <video ref={composedRef} {...mediaProps(mediaApi, MuxVideoBase, props)}>
      {children}
    </video>
  );
});

export namespace MuxVideo {
  export type Props = MuxVideoProps;
}

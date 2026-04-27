'use client';

import { DashMedia } from '@videojs/core/dom/media/dash';
import type { InferClassProps } from '@videojs/utils/types';
import type { PropsWithChildren, VideoHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { attachMediaElement } from '../../utils/attach-media-element';
import { mediaProps } from '../../utils/media-props';
import { useComposedRefs } from '../../utils/use-composed-refs';
import { useMediaInstance } from '../../utils/use-media-instance';

export type DashVideoProps = PropsWithChildren<VideoHTMLAttributes<HTMLVideoElement>> &
  InferClassProps<typeof DashMedia>;

export const DashVideo = forwardRef<HTMLVideoElement, DashVideoProps>(function DashVideo({ children, ...props }, ref) {
  const mediaApi = useMediaInstance(DashMedia);

  const composedRef = useComposedRefs(attachMediaElement(mediaApi), ref);

  return (
    <video ref={composedRef} {...mediaProps(mediaApi, DashMedia, props)}>
      {children}
    </video>
  );
});

export namespace DashVideo {
  export type Props = DashVideoProps;
}

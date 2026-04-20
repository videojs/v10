'use client';

import { DashMedia } from '@videojs/core/dom/media/dash';
import type { ReactNode, VideoHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { useAttachMedia } from '../../utils/use-attach-media';
import { useComposedRefs } from '../../utils/use-composed-refs';
import { useMediaInstance } from '../../utils/use-media-instance';

interface DashMediaProps extends Partial<Pick<DashMedia, 'src'>> {}

export interface DashVideoProps
  extends Omit<VideoHTMLAttributes<HTMLVideoElement>, keyof DashMediaProps>,
    DashMediaProps {
  children?: ReactNode;
}

export const DashVideo = forwardRef<HTMLVideoElement, DashVideoProps>(function DashVideo(
  { children, src, ...htmlProps },
  ref
) {
  const media = useMediaInstance(DashMedia);
  const attachRef = useAttachMedia(media);
  const composedRef = useComposedRefs(attachRef, ref);

  if (src !== undefined && media.src !== src) media.src = src;

  return (
    <video ref={composedRef} {...htmlProps}>
      {children}
    </video>
  );
});

export namespace DashVideo {
  export type Props = DashVideoProps;
}

'use client';

import type { DashMediaProps } from '@videojs/core/dom/media/dash';
import { DashMedia, dashMediaDefaultProps } from '@videojs/core/dom/media/dash';
import type { ReactNode, VideoHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { useAttachMedia } from '../../utils/use-attach-media';
import { useComposedRefs } from '../../utils/use-composed-refs';
import { useMediaInstance } from '../../utils/use-media-instance';
import { useSyncProps } from '../../utils/use-sync-props';

export interface DashVideoProps
  extends Omit<VideoHTMLAttributes<HTMLVideoElement>, keyof DashMediaProps>,
    Partial<DashMediaProps> {
  children?: ReactNode;
}

export const DashVideo = forwardRef<HTMLVideoElement, DashVideoProps>(function DashVideo({ children, ...props }, ref) {
  const media = useMediaInstance(DashMedia);
  const attachRef = useAttachMedia(media);
  const composedRef = useComposedRefs(attachRef, ref);
  const htmlProps = useSyncProps(media, props, dashMediaDefaultProps);

  return (
    <video ref={composedRef} {...htmlProps}>
      {children}
    </video>
  );
});

export namespace DashVideo {
  export type Props = DashVideoProps;
}

'use client';

import type { MuxMediaProps } from '@videojs/core/dom/media/mux';
import { MuxVideoMedia, muxMediaDefaultProps } from '@videojs/core/dom/media/mux';
import type { ReactNode, VideoHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { useAttachMedia } from '../../utils/use-attach-media';
import { useComposedRefs } from '../../utils/use-composed-refs';
import { useMediaInstance } from '../../utils/use-media-instance';
import { useSyncProps } from '../../utils/use-sync-props';

export interface MuxVideoProps
  extends Omit<VideoHTMLAttributes<HTMLVideoElement>, keyof MuxMediaProps>,
    Partial<MuxMediaProps> {
  children?: ReactNode;
}

export const MuxVideo = forwardRef<HTMLVideoElement, MuxVideoProps>(function MuxVideo({ children, ...props }, ref) {
  const media = useMediaInstance(MuxVideoMedia);
  const attachRef = useAttachMedia(media);
  const composedRef = useComposedRefs(attachRef, ref);
  const htmlProps = useSyncProps(media, props, muxMediaDefaultProps);

  return (
    <video ref={composedRef} {...htmlProps}>
      {children}
    </video>
  );
});

export namespace MuxVideo {
  export type Props = MuxVideoProps;
}

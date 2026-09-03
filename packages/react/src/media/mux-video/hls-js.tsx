'use client';

import { hlsMediaDefaultProps, type HlsMediaProps } from '@videojs/hlsjs-video';
import { MuxMedia, muxMediaDefaultProps, type MuxMediaProps } from '@videojs/mux-video';
import { forwardRef, type ReactNode, type VideoHTMLAttributes } from 'react';

import { useAttachMedia } from '../../utils/use-attach-media';
import { useComposedRefs } from '../../utils/use-composed-refs';
import { useMediaInstance } from '../../utils/use-media-instance';
import { useSyncProps } from '../../utils/use-sync-props';
import { MuxStoryboard } from './storyboard';

// `source` comes from `MuxMediaProps` only: `MuxSource` extends `HlsSource` with
// Mux identity fields, so the narrower type has to win.
export interface MuxVideoProps
  extends
    Omit<VideoHTMLAttributes<HTMLVideoElement>, keyof HlsMediaProps | keyof MuxMediaProps>,
    Partial<Omit<HlsMediaProps, 'source'>>,
    Partial<MuxMediaProps> {
  children?: ReactNode;
}

const muxVideoDefaultProps: Omit<HlsMediaProps, 'source'> & MuxMediaProps = {
  ...hlsMediaDefaultProps,
  ...muxMediaDefaultProps,
};

export const MuxVideo = forwardRef<HTMLVideoElement, MuxVideoProps>(function MuxVideo({ children, ...props }, ref) {
  const media = useMediaInstance(MuxMedia);
  const attachRef = useAttachMedia(media);
  const composedRef = useComposedRefs(attachRef, ref);
  const htmlProps = useSyncProps(media, props, muxVideoDefaultProps);

  return (
    <video ref={composedRef} {...htmlProps}>
      <MuxStoryboard media={media} />
      {children}
    </video>
  );
});

export namespace MuxVideo {
  export type Props = MuxVideoProps;
}

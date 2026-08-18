'use client';

import type { HlsVideoMediaProps } from '@videojs/spf/hls-video';
import { hlsVideoMediaDefaultProps } from '@videojs/spf/hls-video';
import type { MuxMediaProps } from '@videojs/spf/mux-video';
import { MuxVideoMedia, muxMediaDefaultProps } from '@videojs/spf/mux-video';
import type { ReactNode, VideoHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { useAttachMedia } from '../../utils/use-attach-media';
import { useComposedRefs } from '../../utils/use-composed-refs';
import { useMediaInstance } from '../../utils/use-media-instance';
import { useSyncProps } from '../../utils/use-sync-props';
import { MuxStoryboard } from './storyboard';

// `src` and `source` come from `MuxMediaProps`: the Mux Media owns both, and its
// `source` is the structured Mux one rather than the generic engine's.
export interface MuxVideoProps
  extends Omit<VideoHTMLAttributes<HTMLVideoElement>, keyof HlsVideoMediaProps | keyof MuxMediaProps>,
    Partial<Omit<HlsVideoMediaProps, 'src'>>,
    Partial<MuxMediaProps> {
  children?: ReactNode;
}

const muxVideoDefaultProps: Omit<HlsVideoMediaProps, 'src'> & MuxMediaProps = {
  ...hlsVideoMediaDefaultProps,
  ...muxMediaDefaultProps,
};

export const MuxVideo = forwardRef<HTMLVideoElement, MuxVideoProps>(function MuxVideo({ children, ...props }, ref) {
  const media = useMediaInstance(MuxVideoMedia);
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

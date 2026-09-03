'use client';

import { type MuxAdapterProps, MuxVideoAdapter } from '@videojs/mux-video/spf';
import type { HlsVideoAdapterProps } from '@videojs/spf/hls-video';
import { forwardRef, type ReactNode, type VideoHTMLAttributes } from 'react';

import { useAttachMedia } from '../../utils/use-attach-media';
import { useComposedRefs } from '../../utils/use-composed-refs';
import { useMediaInstance } from '../../utils/use-media-instance';
import { useSyncProps } from '../../utils/use-sync-props';
import { MuxStoryboard } from './storyboard';

// `src` and `source` come from `MuxAdapterProps`: the Mux Media owns both, and its
// `source` is the structured Mux one rather than the generic engine's.
export interface MuxVideoProps
  extends
    Omit<VideoHTMLAttributes<HTMLVideoElement>, keyof HlsVideoAdapterProps | keyof MuxAdapterProps>,
    Partial<Omit<HlsVideoAdapterProps, 'src'>>,
    Partial<MuxAdapterProps> {
  children?: ReactNode;
}

export const MuxVideo = forwardRef<HTMLVideoElement, MuxVideoProps>(function MuxVideo({ children, ...props }, ref) {
  const media = useMediaInstance(MuxVideoAdapter);
  const attachRef = useAttachMedia(media);
  const composedRef = useComposedRefs(attachRef, ref);
  const htmlProps = useSyncProps(media, props, MuxVideoAdapter.defaultProps);

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

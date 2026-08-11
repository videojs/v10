'use client';

import type { MuxMediaProps } from '@videojs/spf/mux-video';
import { MuxVideoMedia, muxMediaDefaultProps } from '@videojs/spf/mux-video';
import type { SimpleHlsMediaProps } from '@videojs/spf/simple-hls';
import { simpleHlsMediaDefaultProps } from '@videojs/spf/simple-hls';
import type { ReactNode, VideoHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { useAttachMedia } from '../../../utils/use-attach-media';
import { useComposedRefs } from '../../../utils/use-composed-refs';
import { useMediaInstance } from '../../../utils/use-media-instance';
import { useSyncProps } from '../../../utils/use-sync-props';
import { MuxStoryboard } from '../storyboard';

// `src` and `source` come from `MuxMediaProps`: the Mux Media owns both, and its
// `source` is the structured Mux one rather than the generic engine's.
export interface MuxVideoProps
  extends Omit<VideoHTMLAttributes<HTMLVideoElement>, keyof SimpleHlsMediaProps | keyof MuxMediaProps>,
    Partial<Omit<SimpleHlsMediaProps, 'src'>>,
    Partial<MuxMediaProps> {
  children?: ReactNode;
}

const muxVideoDefaultProps: Omit<SimpleHlsMediaProps, 'src'> & MuxMediaProps = {
  ...simpleHlsMediaDefaultProps,
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

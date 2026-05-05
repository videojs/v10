'use client';

import { SimpleHlsMedia } from '@videojs/core/dom/media/simple-hls';
import type { SimpleHlsMediaProps } from '@videojs/spf/hls';
import { simpleHlsMediaDefaultProps } from '@videojs/spf/hls';
import type { ReactNode, VideoHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { useAttachMedia } from '../../utils/use-attach-media';
import { useComposedRefs } from '../../utils/use-composed-refs';
import { useMediaInstance } from '../../utils/use-media-instance';
import { useSyncProps } from '../../utils/use-sync-props';

export interface SimpleHlsVideoProps
  extends Omit<VideoHTMLAttributes<HTMLVideoElement>, keyof SimpleHlsMediaProps>,
    Partial<SimpleHlsMediaProps> {
  children?: ReactNode;
}

export const SimpleHlsVideo = forwardRef<HTMLVideoElement, SimpleHlsVideoProps>(function SimpleHlsVideo(
  { children, ...props },
  ref
) {
  const media = useMediaInstance(SimpleHlsMedia);
  const attachRef = useAttachMedia(media);
  const composedRef = useComposedRefs(attachRef, ref);
  const htmlProps = useSyncProps(media, props, simpleHlsMediaDefaultProps);

  return (
    <video ref={composedRef} {...htmlProps}>
      {children}
    </video>
  );
});

export namespace SimpleHlsVideo {
  export type Props = SimpleHlsVideoProps;
}

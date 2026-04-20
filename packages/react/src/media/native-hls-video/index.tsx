'use client';

import type { NativeHlsMediaProps } from '@videojs/core/dom/media/native-hls';
import { NativeHlsMedia, nativeHlsMediaDefaultProps } from '@videojs/core/dom/media/native-hls';
import type { ReactNode, VideoHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { useAttachMedia } from '../../utils/use-attach-media';
import { useComposedRefs } from '../../utils/use-composed-refs';
import { useMediaInstance } from '../../utils/use-media-instance';
import { useSyncProps } from '../../utils/use-sync-props';

export interface NativeHlsVideoProps
  extends Omit<VideoHTMLAttributes<HTMLVideoElement>, keyof NativeHlsMediaProps>,
    Partial<NativeHlsMediaProps> {
  children?: ReactNode;
}

export const NativeHlsVideo = forwardRef<HTMLVideoElement, NativeHlsVideoProps>(function NativeHlsVideo(
  { children, ...props },
  ref
) {
  const media = useMediaInstance(NativeHlsMedia);
  const attachRef = useAttachMedia(media);
  const composedRef = useComposedRefs(attachRef, ref);
  const htmlProps = useSyncProps(media, props, nativeHlsMediaDefaultProps);

  return (
    <video ref={composedRef} {...htmlProps}>
      {children}
    </video>
  );
});

export namespace NativeHlsVideo {
  export type Props = NativeHlsVideoProps;
}

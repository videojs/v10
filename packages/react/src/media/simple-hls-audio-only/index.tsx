'use client';

import { SimpleHlsAudioOnlyMedia } from '@videojs/core/dom/media/simple-hls-audio-only';
import type { SimpleHlsAudioOnlyMediaProps } from '@videojs/spf/hls';
import { simpleHlsAudioOnlyMediaDefaultProps } from '@videojs/spf/hls';
import type { AudioHTMLAttributes, ReactNode } from 'react';
import { forwardRef } from 'react';
import { useAttachMedia } from '../../utils/use-attach-media';
import { useComposedRefs } from '../../utils/use-composed-refs';
import { useMediaInstance } from '../../utils/use-media-instance';
import { useSyncProps } from '../../utils/use-sync-props';

export interface SimpleHlsAudioOnlyProps
  extends Omit<AudioHTMLAttributes<HTMLAudioElement>, keyof SimpleHlsAudioOnlyMediaProps>,
    Partial<SimpleHlsAudioOnlyMediaProps> {
  children?: ReactNode;
}

export const SimpleHlsAudioOnly = forwardRef<HTMLAudioElement, SimpleHlsAudioOnlyProps>(function SimpleHlsAudioOnly(
  { children, ...props },
  ref
) {
  const media = useMediaInstance(SimpleHlsAudioOnlyMedia);
  const attachRef = useAttachMedia(media);
  const composedRef = useComposedRefs(attachRef, ref);
  const htmlProps = useSyncProps(media, props, simpleHlsAudioOnlyMediaDefaultProps);

  return (
    <audio ref={composedRef} {...htmlProps}>
      {children}
    </audio>
  );
});

export namespace SimpleHlsAudioOnly {
  export type Props = SimpleHlsAudioOnlyProps;
}

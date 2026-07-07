'use client';

import { GoogleCast } from '@videojs/core/dom/media/google-cast';
import type { HlsMediaProps } from '@videojs/core/dom/media/hls-js';
import { HlsJsMedia, hlsMediaDefaultProps } from '@videojs/core/dom/media/hls-js';
import { addComponent } from '@videojs/core/dom/media/media-host';
import { MuxData } from '@videojs/core/dom/media/mux';
import type { AudioHTMLAttributes, ReactNode } from 'react';
import { forwardRef } from 'react';
import { useAttachMedia } from '../../utils/use-attach-media';
import { useComposedRefs } from '../../utils/use-composed-refs';
import { useMediaInstance } from '../../utils/use-media-instance';
import { useSyncProps } from '../../utils/use-sync-props';

export interface MuxAudioProps
  extends Omit<AudioHTMLAttributes<HTMLAudioElement>, keyof HlsMediaProps>,
    Partial<HlsMediaProps> {
  children?: ReactNode;
}

export const MuxAudio = forwardRef<HTMLAudioElement, MuxAudioProps>(function MuxAudio({ children, ...props }, ref) {
  const media = useMediaInstance(HlsJsMedia, (media) => {
    addComponent(media, new MuxData({ playerSoftwareName: 'mux-audio' }));
    addComponent(media, new GoogleCast());
  });
  const attachRef = useAttachMedia(media);
  const composedRef = useComposedRefs(attachRef, ref);
  const htmlProps = useSyncProps(media, props, hlsMediaDefaultProps);

  return (
    <audio ref={composedRef} {...htmlProps}>
      {children}
    </audio>
  );
});

export namespace MuxAudio {
  export type Props = MuxAudioProps;
}

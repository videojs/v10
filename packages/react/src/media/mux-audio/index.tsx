'use client';

import type { MuxMediaProps } from '@videojs/core/dom/media/mux';
import { MuxAudioMedia, muxMediaDefaultProps } from '@videojs/core/dom/media/mux';
import type { AudioHTMLAttributes, ReactNode } from 'react';
import { forwardRef } from 'react';
import { useAttachMedia } from '../../utils/use-attach-media';
import { useComposedRefs } from '../../utils/use-composed-refs';
import { useMediaInstance } from '../../utils/use-media-instance';
import { useSyncProps } from '../../utils/use-sync-props';

/** Props for the MuxAudio component. */
export interface MuxAudioProps
  extends Omit<AudioHTMLAttributes<HTMLAudioElement>, keyof MuxMediaProps>,
    Partial<MuxMediaProps> {
  /** Content rendered inside the underlying `<audio>` element. */
  children?: ReactNode;
}

/** Renders an `<audio>` element backed by the Mux media engine and attaches it to the player. */
export const MuxAudio = forwardRef<HTMLAudioElement, MuxAudioProps>(function MuxAudio({ children, ...props }, ref) {
  const media = useMediaInstance(MuxAudioMedia);
  const attachRef = useAttachMedia(media);
  const composedRef = useComposedRefs(attachRef, ref);
  const htmlProps = useSyncProps(media, props, muxMediaDefaultProps);

  return (
    <audio ref={composedRef} {...htmlProps}>
      {children}
    </audio>
  );
});

export namespace MuxAudio {
  export type Props = MuxAudioProps;
}

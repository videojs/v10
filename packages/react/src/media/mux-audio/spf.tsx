'use client';

import { type MuxAdapterProps, MuxAudioAdapter } from '@videojs/mux-audio/spf';
import type { HlsAudioAdapterProps } from '@videojs/spf/hls-audio';
import { type AudioHTMLAttributes, forwardRef, type ReactNode } from 'react';

import { useAttachMedia } from '../../utils/use-attach-media';
import { useComposedRefs } from '../../utils/use-composed-refs';
import { useMediaInstance } from '../../utils/use-media-instance';
import { useSyncProps } from '../../utils/use-sync-props';

// `src` and `source` come from `MuxAdapterProps`: the Mux Media owns both, and its
// `source` is the structured Mux one rather than the generic engine's.
export interface MuxAudioProps
  extends
    Omit<AudioHTMLAttributes<HTMLAudioElement>, keyof HlsAudioAdapterProps | keyof MuxAdapterProps>,
    Partial<Omit<HlsAudioAdapterProps, 'src'>>,
    Partial<MuxAdapterProps> {
  children?: ReactNode;
}

export const MuxAudio = forwardRef<HTMLAudioElement, MuxAudioProps>(function MuxAudio({ children, ...props }, ref) {
  const media = useMediaInstance(MuxAudioAdapter);
  const attachRef = useAttachMedia(media);
  const composedRef = useComposedRefs(attachRef, ref);
  const htmlProps = useSyncProps(media, props, MuxAudioAdapter.defaultProps);

  return (
    <audio ref={composedRef} {...htmlProps}>
      {children}
    </audio>
  );
});

export namespace MuxAudio {
  export type Props = MuxAudioProps;
}

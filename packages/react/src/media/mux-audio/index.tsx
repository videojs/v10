import { MuxAudioMedia } from '@videojs/core/dom/media/mux';
import type { InferClassProps } from '@videojs/utils/types';
import type { AudioHTMLAttributes, PropsWithChildren } from 'react';
import { forwardRef } from 'react';
import { attachMediaElement } from '../../utils/attach-media-element';
import { mediaProps } from '../../utils/media-props';
import { useComposedRefs } from '../../utils/use-composed-refs';
import { useMediaInstance } from '../../utils/use-media-instance';

export type MuxAudioProps = PropsWithChildren<AudioHTMLAttributes<HTMLAudioElement>> &
  InferClassProps<typeof MuxAudioMedia>;

export const MuxAudio = forwardRef<HTMLAudioElement, MuxAudioProps>(({ children, ...props }, ref) => {
  const mediaApi = useMediaInstance(MuxAudioMedia);

  const composedRef = useComposedRefs(attachMediaElement(mediaApi), ref);

  return (
    <audio ref={composedRef} {...mediaProps(mediaApi, MuxAudioMedia, props)}>
      {children}
    </audio>
  );
});

export default MuxAudio;

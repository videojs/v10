import type { InferDelegateProps } from '@videojs/core';
import { MuxAudio as MuxAudioApi, MuxMediaDelegate } from '@videojs/core/dom/media/mux';
import type { AudioHTMLAttributes, PropsWithChildren } from 'react';
import { forwardRef } from 'react';
import { attachMediaElement } from '../../utils/attach-media-element';
import { mediaProps } from '../../utils/media-props';
import { useComposedRefs } from '../../utils/use-composed-refs';
import { useMediaInstance } from '../../utils/use-media-instance';

export type MuxAudioProps = PropsWithChildren<AudioHTMLAttributes<HTMLAudioElement>> &
  InferDelegateProps<typeof MuxMediaDelegate>;

export const MuxAudio = forwardRef<HTMLAudioElement, MuxAudioProps>(({ children, ...props }, ref) => {
  const mediaApi = useMediaInstance(MuxAudioApi);

  const composedRef = useComposedRefs(attachMediaElement(mediaApi), ref);

  return (
    <audio ref={composedRef} {...mediaProps(mediaApi, MuxMediaDelegate, props)}>
      {children}
    </audio>
  );
});

export default MuxAudio;

'use client';

import type { VideoHTMLAttributes } from 'react';
import { forwardRef, useCallback } from 'react';

import { useMediaRegistration } from '../player/context';
import { useComposedRefs } from '../utils/use-composed-refs';

export interface VideoProps extends VideoHTMLAttributes<HTMLVideoElement> {}

export const Video = forwardRef<HTMLVideoElement, VideoProps>(function Video({ children, ...props }, ref) {
  const setMedia = useMediaRegistration();

  const mediaRef = useCallback(
    (el: HTMLVideoElement | null) => {
      setMedia?.(el);
    },
    [setMedia]
  );

  const composedRef = useComposedRefs(ref, mediaRef);

  return (
    <video ref={composedRef} {...props}>
      {children}
    </video>
  );
});

export namespace Video {
  export type Props = VideoProps;
}

'use client';

import type { VideoHTMLAttributes } from 'react';
import { forwardRef } from 'react';

import { useControlsMounted, useMediaAttach } from '../player/context';
import { useComposedRefs } from '../utils/use-composed-refs';

export interface VideoProps extends VideoHTMLAttributes<HTMLVideoElement> {}

export const Video = forwardRef<HTMLVideoElement, VideoProps>(function Video({ children, controls, ...props }, ref) {
  const setMedia = useMediaAttach();
  const controlsMounted = useControlsMounted();
  const composedRef = useComposedRefs(ref, setMedia);

  return (
    <video ref={composedRef} controls={controlsMounted ? false : controls} {...props}>
      {children}
    </video>
  );
});

export namespace Video {
  export type Props = VideoProps;
}

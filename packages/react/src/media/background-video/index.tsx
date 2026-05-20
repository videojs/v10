'use client';

import type { VideoHTMLAttributes } from 'react';
import { forwardRef, useCallback } from 'react';

import { useMediaAttach } from '../../player/context';
import { useComposedRefs } from '../../utils/use-composed-refs';

export interface BackgroundVideoProps extends VideoHTMLAttributes<HTMLVideoElement> {}

/** Renders a muted, autoplaying, looping `<video>` element for ambient background use. */
export const BackgroundVideo = forwardRef<HTMLVideoElement, BackgroundVideoProps>(function BackgroundVideo(
  { children, ...props },
  ref
) {
  const setMedia = useMediaAttach();

  const mediaRef = useCallback(
    (el: HTMLVideoElement | null) => {
      setMedia?.(el);
    },
    [setMedia]
  );

  const composedRef = useComposedRefs(ref, mediaRef);

  return (
    <video ref={composedRef} muted autoPlay loop playsInline disableRemotePlayback disablePictureInPicture {...props}>
      {children}
    </video>
  );
});

export namespace BackgroundVideo {
  export type Props = BackgroundVideoProps;
}

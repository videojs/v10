'use client';

import type { AudioHTMLAttributes } from 'react';
import { forwardRef, useCallback } from 'react';

import { useMediaRegistration } from '../player/context';
import { useComposedRefs } from '../utils/use-composed-refs';

export interface AudioProps extends AudioHTMLAttributes<HTMLAudioElement> {}

export const Audio = forwardRef<HTMLAudioElement, AudioProps>(function Audio({ children, ...props }, ref) {
  const setMedia = useMediaRegistration();

  const mediaRef = useCallback(
    (el: HTMLAudioElement | null) => {
      setMedia?.(el);
    },
    [setMedia]
  );

  const composedRef = useComposedRefs(ref, mediaRef);

  return (
    <audio ref={composedRef} {...props}>
      {children}
    </audio>
  );
});

export namespace Audio {
  export type Props = AudioProps;
}

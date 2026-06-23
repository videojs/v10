'use client';

import type { AudioHTMLAttributes } from 'react';
import { forwardRef } from 'react';

import { useControlsMounted, useMediaAttach } from '../player/context';
import { useComposedRefs } from '../utils/use-composed-refs';

export interface AudioProps extends AudioHTMLAttributes<HTMLAudioElement> {}

export const Audio = forwardRef<HTMLAudioElement, AudioProps>(function Audio({ children, controls, ...props }, ref) {
  const setMedia = useMediaAttach();
  const controlsMounted = useControlsMounted();
  const composedRef = useComposedRefs(ref, setMedia);

  return (
    <audio ref={composedRef} controls={controlsMounted ? false : controls} {...props}>
      {children}
    </audio>
  );
});

export namespace Audio {
  export type Props = AudioProps;
}

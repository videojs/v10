import type { Media } from '@videojs/react';
import { useMediaRegistration } from '@videojs/react';
import type { CanvasHTMLAttributes, ForwardedRef } from 'react';
import { forwardRef, useCallback, useEffect, useState } from 'react';

import { GifMedia } from './gif-media';

export interface AnimatedGifProps extends CanvasHTMLAttributes<HTMLCanvasElement> {
  src?: string;
}

export const AnimatedGif = forwardRef(function AnimatedGif(
  { src, ...props }: AnimatedGifProps,
  forwardedRef: ForwardedRef<HTMLCanvasElement>
) {
  const [gifMedia] = useState(() => new GifMedia());
  const setMedia = useMediaRegistration();

  useEffect(() => {
    setMedia?.(gifMedia as unknown as Media);
    return () => setMedia?.(null);
  }, [gifMedia, setMedia]);

  useEffect(() => {
    gifMedia.src = src ?? '';
  }, [src, gifMedia]);

  const canvasRef = useCallback(
    (el: HTMLCanvasElement | null) => {
      if (el) gifMedia.attach(el);
      else gifMedia.detach();

      if (typeof forwardedRef === 'function') {
        forwardedRef(el);
      } else if (forwardedRef) {
        forwardedRef.current = el;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gifMedia, forwardedRef]
  );

  return <canvas ref={canvasRef} {...props} />;
});

export namespace AnimatedGif {
  export type Props = AnimatedGifProps;
}

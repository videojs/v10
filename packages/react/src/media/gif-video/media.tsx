'use client';

import type { GifMediaProps } from '@videojs/media/dom/gif';
import { GifMedia, gifMediaDefaultProps } from '@videojs/media/dom/gif';
import type { ReactNode } from 'react';
import { forwardRef } from 'react';
import { useAttachCanvas } from '../../utils/use-attach-canvas';
import { useComposedRefs } from '../../utils/use-composed-refs';
import { useMediaInstance } from '../../utils/use-media-instance';
import { useSyncProps } from '../../utils/use-sync-props';

export interface GifVideoProps extends Partial<GifMediaProps> {
  children?: ReactNode;
}

export const GifVideo = forwardRef<HTMLCanvasElement, GifVideoProps>(function GifVideo({ children, ...rawProps }, ref) {
  const media = useMediaInstance(GifMedia);
  const props: Partial<GifMediaProps> & Record<string, unknown> = { ...rawProps };
  const attachRef = useAttachCanvas(media);
  const composedRef = useComposedRefs(attachRef, ref);
  const canvasProps = useSyncProps<GifMediaProps, Record<string, unknown>>(media, props, gifMediaDefaultProps);

  return (
    <canvas role="img" aria-label="Animated GIF" {...canvasProps} ref={composedRef}>
      {children}
    </canvas>
  );
});

export namespace GifVideo {
  export type Props = GifVideoProps;
}

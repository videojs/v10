'use client';

import type { YouTubeMediaProps } from '@videojs/core/dom/media/youtube';
import { YouTubeMedia, youTubeMediaDefaultProps } from '@videojs/core/dom/media/youtube';
import { cn } from '@videojs/utils/style';
import type { HTMLAttributes, ReactNode, RefCallback } from 'react';
import { forwardRef, useCallback } from 'react';
import { useComposedRefs } from '../../utils/use-composed-refs';
import { useMediaInstance } from '../../utils/use-media-instance';
import { useSyncProps } from '../../utils/use-sync-props';

export interface YouTubeVideoProps
  extends Omit<HTMLAttributes<HTMLDivElement>, keyof YouTubeMediaProps>,
    Partial<YouTubeMediaProps> {
  children?: ReactNode;
}

export const YouTubeVideo = forwardRef<HTMLDivElement, YouTubeVideoProps>(function YouTubeVideo(
  { children, ...props },
  ref
) {
  const media = useMediaInstance(YouTubeMedia);

  // YouTubeMedia targets an HTMLElement container (not HTMLMediaElement), so we
  // inline the attach callback instead of using useAttachMedia.
  const attachRef: RefCallback<HTMLDivElement> = useCallback(
    (element) => {
      if (element) media.attach(element);
      else media.detach();
      return () => media.detach();
    },
    [media]
  );

  const composedRef = useComposedRefs(attachRef, ref);
  const htmlProps = useSyncProps(media, props, youTubeMediaDefaultProps);

  return (
    <div ref={composedRef} {...htmlProps} className={cn('media-youtube', htmlProps.className)}>
      {children}
    </div>
  );
});

export namespace YouTubeVideo {
  export type Props = YouTubeVideoProps;
}

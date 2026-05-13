'use client';

import type { VimeoMediaProps } from '@videojs/core/dom/media/vimeo';
import { VimeoMedia, vimeoMediaDefaultProps } from '@videojs/core/dom/media/vimeo';
import { cn } from '@videojs/utils/style';
import type { HTMLAttributes, ReactNode, RefCallback } from 'react';
import { forwardRef, useCallback } from 'react';
import { useComposedRefs } from '../../utils/use-composed-refs';
import { useMediaInstance } from '../../utils/use-media-instance';
import { useSyncProps } from '../../utils/use-sync-props';

export interface VimeoVideoProps
  extends Omit<HTMLAttributes<HTMLDivElement>, keyof VimeoMediaProps>,
    Partial<VimeoMediaProps> {
  children?: ReactNode;
}

export const VimeoVideo = forwardRef<HTMLDivElement, VimeoVideoProps>(function VimeoVideo({ children, ...props }, ref) {
  const media = useMediaInstance(VimeoMedia);

  // VimeoMedia targets an HTMLElement container (not HTMLMediaElement), so we
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
  const htmlProps = useSyncProps(media, props, vimeoMediaDefaultProps);

  return (
    <div ref={composedRef} {...htmlProps} className={cn('media-vimeo', htmlProps.className)}>
      {children}
    </div>
  );
});

export namespace VimeoVideo {
  export type Props = VimeoVideoProps;
}

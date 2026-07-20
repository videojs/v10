'use client';

import type { YouTubeMediaProps } from '@videojs/core/dom/media/youtube';
import { buildYouTubeIframeSrc, YouTubeMedia, youtubeMediaDefaultProps } from '@videojs/core/dom/media/youtube';
import type { ReactNode } from 'react';
import { forwardRef, useState } from 'react';
import { useAttachIframe } from '../../utils/use-attach-iframe';
import { useComposedRefs } from '../../utils/use-composed-refs';
import { useMediaInstance } from '../../utils/use-media-instance';
import { useSyncProps } from '../../utils/use-sync-props';

export interface YouTubeVideoProps extends Partial<YouTubeMediaProps> {
  children?: ReactNode;
}

export const YouTubeVideo = forwardRef<HTMLIFrameElement, YouTubeVideoProps>(function YouTubeVideo(
  { children, ...rawProps },
  ref
) {
  const media = useMediaInstance(YouTubeMedia);
  const props: Partial<YouTubeMediaProps> & Record<string, unknown> = { ...rawProps };
  const attachRef = useAttachIframe(media);
  const composedRef = useComposedRefs(attachRef, ref);
  const [initialSrc] = useState(() =>
    buildYouTubeIframeSrc(props.src ?? '', { ...youtubeMediaDefaultProps, ...props })
  );
  const iframeProps = useSyncProps<YouTubeMediaProps, Record<string, unknown>>(media, props, youtubeMediaDefaultProps);

  return (
    <iframe
      title="YouTube video player"
      src={initialSrc}
      data-cross-origin-frame
      allow="accelerometer; fullscreen; autoplay; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      frameBorder={0}
      width="100%"
      height="100%"
      referrerPolicy={props.config?.referrerPolicy}
      {...iframeProps}
      ref={composedRef}
    >
      {children}
    </iframe>
  );
});

export namespace YouTubeVideo {
  export type Props = YouTubeVideoProps;
}

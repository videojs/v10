'use client';

import type { YouTubeMediaProps } from '@videojs/media/dom/youtube';
import { buildYouTubeIframeSrc, YouTubeMedia, youtubeMediaDefaultProps } from '@videojs/media/dom/youtube';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { forwardRef, useState } from 'react';

import { useAttachIframe } from '../../utils/use-attach-iframe';
import { useComposedRefs } from '../../utils/use-composed-refs';
import { useMediaInstance } from '../../utils/use-media-instance';
import { useSyncProps } from '../../utils/use-sync-props';

export type YouTubeVideoProps = Partial<YouTubeMediaProps> &
  Omit<ComponentPropsWithoutRef<'iframe'>, keyof YouTubeMediaProps> & {
    children?: ReactNode;
  };

export const YouTubeVideo = forwardRef<HTMLIFrameElement, YouTubeVideoProps>(function YouTubeVideo(
  { children, ...rawProps },
  ref
) {
  const media = useMediaInstance(YouTubeMedia);
  const props = { ...rawProps };
  const attachRef = useAttachIframe(media);
  const composedRef = useComposedRefs(attachRef, ref);
  const [initialSrc] = useState(() =>
    // `source.src` is the only other way to name a video, so honor it when `src` is absent.
    buildYouTubeIframeSrc(props.src || props.source?.src || '', { ...youtubeMediaDefaultProps, ...props })
  );
  const iframeProps = useSyncProps<YouTubeMediaProps, typeof props>(media, props, youtubeMediaDefaultProps);

  return (
    <iframe
      title="YouTube video player"
      // Empty means there is no embed to point at yet; React warns about `src=""`,
      // and the media builds the URL itself once a source resolves.
      src={initialSrc || undefined}
      data-cross-origin-frame
      allow="accelerometer; fullscreen; autoplay; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      frameBorder={0}
      width="100%"
      height="100%"
      referrerPolicy={props.source?.engine?.youtube?.referrerPolicy}
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

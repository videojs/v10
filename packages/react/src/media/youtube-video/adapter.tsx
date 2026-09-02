'use client';

import { buildYouTubeIframeSrc, YouTubeAdapter } from '@videojs/youtube-video';

import { createMediaComponent, type MediaComponentProps } from '../create-media-component';

export type YouTubeVideoProps = MediaComponentProps<typeof YouTubeAdapter>;

export const YouTubeVideo = createMediaComponent(
  YouTubeAdapter,
  ({ adapter, props, children, ref, initialProps }) => {
    const initialSrc =
      // `source.src` is the only other way to name a video, so honor it when `src` is absent.
      buildYouTubeIframeSrc(initialProps.src || initialProps.source?.src || '', {
        ...YouTubeAdapter.defaultProps,
        ...initialProps,
      });

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
        referrerPolicy={adapter.source?.engine?.youtube?.referrerPolicy}
        {...props}
        ref={ref}
      >
        {children}
      </iframe>
    );
  },
  { displayName: 'YouTubeVideo' }
);

export namespace YouTubeVideo {
  export type Props = YouTubeVideoProps;
}

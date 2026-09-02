'use client';

import { buildTikTokIframeSrc, TikTokAdapter } from '@videojs/tiktok-video';

import { createMediaComponent, type MediaComponentProps } from '../create-media-component';

export type TikTokVideoProps = MediaComponentProps<typeof TikTokAdapter>;

export const TikTokVideo = createMediaComponent(
  TikTokAdapter,
  ({ adapter, props, children, ref, initialProps }) => {
    const initialSrc =
      // `source.src` is the only other way to name a video, so honor it when `src` is absent.
      buildTikTokIframeSrc(initialProps.src || initialProps.source?.src || '', {
        ...TikTokAdapter.defaultProps,
        ...initialProps,
        // The frame reads mute once, out of the URL it is rendered with, and either
        // prop says to start muted. Rendering it any other way than the media
        // builds it would have the media rebuild the frame on mount.
        defaultMuted: !!(initialProps.defaultMuted || initialProps.muted),
      });

    return (
      <iframe
        title="TikTok video player"
        // Empty means there is no embed to point at yet; React warns about `src=""`,
        // and the media builds the URL itself once a source resolves.
        src={initialSrc || undefined}
        data-cross-origin-frame
        allow="accelerometer; fullscreen; autoplay; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        frameBorder={0}
        width="100%"
        height="100%"
        referrerPolicy={adapter.source?.engine?.tiktok?.referrerPolicy}
        {...props}
        ref={ref}
      >
        {children}
      </iframe>
    );
  },
  { displayName: 'TikTokVideo' }
);

export namespace TikTokVideo {
  export type Props = TikTokVideoProps;
}

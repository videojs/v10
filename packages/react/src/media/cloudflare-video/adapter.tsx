'use client';

import { buildCloudflareIframeSrc, CloudflareAdapter } from '@videojs/cloudflare-video';

import { createMediaComponent, type MediaComponentProps } from '../create-media-component';

export type CloudflareVideoProps = MediaComponentProps<typeof CloudflareAdapter>;

export const CloudflareVideo = createMediaComponent(
  CloudflareAdapter,
  ({ adapter, props, children, ref, initialProps }) => {
    const initialSrc =
      // `source.src` is the only other way to name a video, so honor it when `src` is absent.
      buildCloudflareIframeSrc(initialProps.src || initialProps.source?.src || '', {
        ...CloudflareAdapter.defaultProps,
        ...initialProps,
        // The embed reads mute once, out of the URL it is rendered with, and either
        // prop says to start muted. Leaving `muted` out of the URL would leave a
        // muted autoplay blocked by the browser, since the embed comes up audible.
        defaultMuted: !!(initialProps.defaultMuted || initialProps.muted),
      });

    return (
      <iframe
        title="Cloudflare Stream video player"
        // Empty means there is no embed to point at yet; React warns about `src=""`,
        // and the media builds the URL itself once a source resolves.
        src={initialSrc || undefined}
        data-cross-origin-frame
        allow="accelerometer; fullscreen; autoplay; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        frameBorder={0}
        width="100%"
        height="100%"
        referrerPolicy={adapter.source?.engine?.cloudflare?.referrerPolicy}
        {...props}
        ref={ref}
      >
        {children}
      </iframe>
    );
  },
  { displayName: 'CloudflareVideo' }
);

export namespace CloudflareVideo {
  export type Props = CloudflareVideoProps;
}

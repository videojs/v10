'use client';

import { buildTwitchIframeSrc, TwitchAdapter } from '@videojs/twitch-video';

import { createMediaComponent, type MediaComponentProps } from '../create-media-component';

export type TwitchVideoProps = MediaComponentProps<typeof TwitchAdapter>;

export const TwitchVideo = createMediaComponent(
  TwitchAdapter,
  ({ adapter, props, children, ref, initialProps }) => {
    const initialSrc =
      // Server rendering has no `location` to name as the embed's parent, and Twitch
      // refuses to play in a page its URL never named. Rendering no `src` leaves the
      // URL to `attach()`, which builds it where there is a hostname to name.
      globalThis.location
        ? // `source.src` is the only other way to name a video, so honor it when `src` is absent.
          buildTwitchIframeSrc(initialProps.src || initialProps.source?.src || '', {
            ...TwitchAdapter.defaultProps,
            ...initialProps,
          })
        : '';

    return (
      <iframe
        title="Twitch video player"
        // Empty means there is no embed to point at yet; React warns about `src=""`,
        // and the media builds the URL itself once a source resolves.
        src={initialSrc || undefined}
        data-cross-origin-frame
        allow="accelerometer; fullscreen; autoplay; encrypted-media; picture-in-picture;"
        sandbox="allow-modals allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        scrolling="no"
        frameBorder={0}
        width="100%"
        height="100%"
        referrerPolicy={adapter.source?.engine?.twitch?.referrerPolicy}
        {...props}
        ref={ref}
      >
        {children}
      </iframe>
    );
  },
  { displayName: 'TwitchVideo' }
);

export namespace TwitchVideo {
  export type Props = TwitchVideoProps;
}

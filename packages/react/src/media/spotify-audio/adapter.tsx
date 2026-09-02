'use client';

import { buildSpotifyIframeSrc, SpotifyAdapter } from '@videojs/spotify-audio';
import type { CSSProperties } from 'react';

import { createMediaComponent, type MediaComponentProps } from '../create-media-component';

export type SpotifyAudioProps = MediaComponentProps<typeof SpotifyAdapter>;

export const SpotifyAudio = createMediaComponent(
  SpotifyAdapter,
  ({ adapter, props, children, ref, initialProps }) => {
    const initialSrc =
      // `source.src` is the only other way to name an entity, so honor it when `src` is absent.
      buildSpotifyIframeSrc(initialProps.src || initialProps.source?.src || '', {
        ...SpotifyAdapter.defaultProps,
        ...initialProps,
      });
    const { style, ...iframeProps } = props as Record<string, unknown> & { style?: CSSProperties };

    return (
      <iframe
        title="Spotify audio player"
        // Empty means there is no embed to point at yet; React warns about `src=""`,
        // and the media builds the URL itself once a source resolves.
        src={initialSrc || undefined}
        data-cross-origin-frame
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        frameBorder={0}
        width="100%"
        height="100%"
        referrerPolicy={adapter.source?.engine?.spotify?.referrerPolicy}
        {...iframeProps}
        // Without Spotify's own chrome the embed is a transport and nothing else:
        // its player UI would otherwise show through whatever skin is drawn over it.
        // Inline so a `className` cannot put it back on screen, merged so a
        // consumer's own styles survive. A hidden iframe still loads and plays.
        style={adapter.controls ? style : { ...style, display: 'none' }}
        ref={ref}
      >
        {children}
      </iframe>
    );
  },
  { displayName: 'SpotifyAudio' }
);

export namespace SpotifyAudio {
  export type Props = SpotifyAudioProps;
}

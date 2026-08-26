'use client';

import type { SpotifyMediaProps } from '@videojs/media/dom/spotify';
import { buildSpotifyIframeSrc, SpotifyMedia, spotifyMediaDefaultProps } from '@videojs/media/dom/spotify';
import type { CSSProperties, ReactNode } from 'react';
import { forwardRef, useState } from 'react';

import { useAttachIframe } from '../../utils/use-attach-iframe';
import { useComposedRefs } from '../../utils/use-composed-refs';
import { useMediaInstance } from '../../utils/use-media-instance';
import { useSyncProps } from '../../utils/use-sync-props';

export interface SpotifyAudioProps extends Partial<SpotifyMediaProps> {
  children?: ReactNode;
}

export const SpotifyAudio = forwardRef<HTMLIFrameElement, SpotifyAudioProps>(function SpotifyAudio(
  { children, ...rawProps },
  ref
) {
  const media = useMediaInstance(SpotifyMedia);
  const props: Partial<SpotifyMediaProps> & Record<string, unknown> = { ...rawProps };
  const attachRef = useAttachIframe(media);
  const composedRef = useComposedRefs(attachRef, ref);
  const [initialSrc] = useState(() =>
    // `source.src` is the only other way to name an entity, so honor it when `src` is absent.
    buildSpotifyIframeSrc(props.src || props.source?.src || '', { ...spotifyMediaDefaultProps, ...props })
  );
  const { style, ...iframeProps } = useSyncProps<SpotifyMediaProps, Record<string, unknown>>(
    media,
    props,
    spotifyMediaDefaultProps
  ) as Record<string, unknown> & { style?: CSSProperties };

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
      referrerPolicy={props.source?.engine?.spotify?.referrerPolicy}
      {...iframeProps}
      // Without Spotify's own chrome the embed is a transport and nothing else:
      // its player UI would otherwise show through whatever skin is drawn over it.
      // Inline so a `className` cannot put it back on screen, merged so a
      // consumer's own styles survive. A hidden iframe still loads and plays.
      style={props.controls ? style : { ...style, display: 'none' }}
      ref={composedRef}
    >
      {children}
    </iframe>
  );
});

export namespace SpotifyAudio {
  export type Props = SpotifyAudioProps;
}

'use client';

import { PosterCore, PosterDataAttrs } from '@videojs/core';
import { logMissingFeature, selectMetadata, selectPlayback } from '@videojs/core/dom';
import type { ForwardedRef, SyntheticEvent } from 'react';
import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';

import { usePlayer } from '../../player/context';
import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';

export interface PosterProps extends UIComponentProps<'img', PosterCore.State> {}

/**
 * Displays the video poster image. Shows before playback starts, hides after.
 *
 * Renders an `<img>`, so `srcset`, `sizes`, `loading`, and the rest of the
 * image attributes are yours. Leave `src` off and the player's resolved
 * `poster` fills it in, which is why the URL is set on the provider rather than
 * here.
 *
 * The image is decorative unless you say otherwise. Describe a poster that
 * carries meaning by passing your own `alt`.
 *
 * @example
 * ```tsx
 * <Player.Provider poster="poster.jpg">
 *   <Poster />
 * </Player.Provider>
 *
 * <Poster srcSet="poster-480.jpg 480w, poster-1080.jpg 1080w" sizes="100vw" />
 *
 * <Poster render={(props) => <Image {...props} alt="" fill />} />
 * ```
 */
export const Poster = forwardRef(function Poster(
  componentProps: PosterProps,
  forwardedRef: ForwardedRef<HTMLImageElement>
) {
  const { render, className, style, ...elementProps } = componentProps;

  const playback = usePlayer(selectPlayback);
  const metadata = usePlayer(selectMetadata);

  const [core] = useState(() => new PosterCore());

  // The metadata feature is optional: without it nothing resolves a URL, and
  // this stays a visibility wrapper around whatever `src` was passed.
  if (playback) {
    core.setMedia({ started: playback.started, poster: metadata?.poster ?? '' });
  }

  const state = playback ? core.getState() : null;

  // An explicit `src` wins over the resolved one, the counterpart of slotting
  // your own image in HTML.
  const src = (elementProps as { src?: string }).src ?? state?.src ?? '';

  // Track when the current src has finished loading so the CSS blur-up
  // sequence can show the placeholder first, then crossfade to the full image.
  const [loadedSrc, setLoadedSrc] = useState<string | undefined>(undefined);
  const loaded = src !== '' && loadedSrc === src;
  const imgRef = useRef<HTMLImageElement | null>(null);

  // A cached image may already be complete when the element mounts, in which
  // case onLoad never fires. Check synchronously after mount and on src change.
  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0 && img.getAttribute('src') === src) {
      setLoadedSrc(src);
    }
  }, [src]);

  const handleLoad = useCallback((event: SyntheticEvent<HTMLImageElement>) => {
    setLoadedSrc(event.currentTarget.getAttribute('src') ?? undefined);
  }, []);

  if (!playback || !state) {
    if (__DEV__) logMissingFeature('Poster', 'playback');
    return null;
  }

  return renderElement(
    'img',
    { render, className, style },
    {
      state,
      stateAttrMap: PosterDataAttrs,
      ref: [forwardedRef, imgRef],
      props: [
        { alt: '' },
        elementProps,
        // An empty `src` requests the document URL, so leave the attribute off.
        { src: src === '' ? undefined : src, 'data-loaded': loaded ? '' : undefined, onLoad: handleLoad },
      ],
    }
  );
});

export namespace Poster {
  export type Props = PosterProps;
  export type State = PosterCore.State;
}

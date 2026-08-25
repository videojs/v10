import { PosterCore, PosterDataAttrs, type PosterImageLoadState } from '@videojs/core';
import { logMissingFeature, selectMetadata, selectPlayback } from '@videojs/core/dom';
import type { ForwardedRef } from 'react';
import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';

import { usePlayer } from '../../player/context';
import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';

export interface PosterProps extends UIComponentProps<'img', PosterCore.State> {}

/** The source currently requested from the image, and how it is faring. */
interface ImageRequest {
  src: string;
  srcSet: string | undefined;
  state: PosterImageLoadState;
}

/**
 * Displays the video poster image. Shows before playback starts, hides after.
 *
 * Renders an `<img>`, so `srcset`, `sizes`, `loading`, and the rest of the image attributes are yours. Leave the source
 * off and the player's resolved `poster` fills it in.
 *
 * The image is decorative unless you say otherwise. Describe a poster that carries meaning by passing your own `alt`.
 *
 * @example
 *   ```tsx
 *   <VideoPlayer poster="poster.jpg">
 *   <Poster />
 *   </VideoPlayer>
 *
 *   <Poster srcSet="poster-480.jpg 480w, poster-1080.jpg 1080w" sizes="100vw" />
 *
 *   <Poster
 *   render={({ src, ...props }: ComponentProps<'img'>) =>
 *   src ? <Image {...props} src={src} alt="" fill /> : null
 *   }
 *   />
 *   ```;
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
    core.setMedia({
      started: playback.started,
      poster: metadata?.poster ?? '',
    });
  }

  const { src: authoredSrc, srcSet: authoredSrcSet } = elementProps as { src?: string; srcSet?: string };

  // Either authored source makes the image yours, matching `hasSource` in the
  // HTML element. Filling `src` alongside a `srcset` would inject the player's
  // poster into your candidate set as the 1x entry.
  const src = authoredSrc ?? (authoredSrcSet === undefined && playback ? core.getState().src : '');

  const initialLoadState: PosterImageLoadState = !src && authoredSrcSet === undefined ? 'none' : 'loading';
  const [request, setRequest] = useState<ImageRequest>(() => ({
    src,
    srcSet: authoredSrcSet,
    state: initialLoadState,
  }));
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Keep only the active request. Retaining a settled source by value would
  // resurrect its old state when the image moved A -> B -> A, even though the
  // second A is a new request. `srcSet` is part of the identity because `src`
  // stays empty when it is the only source.
  const matchesRequest = request.src === src && request.srcSet === authoredSrcSet;

  if (!matchesRequest) setRequest({ src, srcSet: authoredSrcSet, state: initialLoadState });

  const loadState = matchesRequest ? request.state : initialLoadState;

  if (playback) core.setImageLoadState(loadState);

  const state = playback ? core.getState() : null;

  // An image can already be settled when we first see it — hydrated from server
  // markup, say — in which case neither `load` nor `error` ever fires. Decoded
  // pixels stand on their own; the absence of them only means failure once
  // `complete` can be trusted, which takes a source on the image itself, since one
  // sourced by a `<picture>` an override wrapped it in is `complete` regardless.
  //
  // Only when we first see it. A later source change leaves the previous request's
  // pixels in place until the new one settles, so reading them again would call
  // the new source loaded while it is still fetching. `load` and `error` cover
  // every source after this one, the way the HTML element reads an image once.
  // oxlint-disable-next-line react/exhaustive-deps -- reads the first source only, at mount
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    if (img.naturalWidth > 0) setRequest({ src, srcSet: authoredSrcSet, state: 'loaded' });
    else if (img.complete && (img.getAttribute('src') || img.hasAttribute('srcset'))) {
      setRequest({ src, srcSet: authoredSrcSet, state: 'error' });
    }
  }, []);

  // Recorded against the source this render asked for, not the one on the
  // element: a `render` override is free to rewrite it.
  const handleLoad = useCallback(
    () => setRequest({ src, srcSet: authoredSrcSet, state: 'loaded' }),
    [src, authoredSrcSet]
  );
  const handleError = useCallback(
    () => setRequest({ src, srcSet: authoredSrcSet, state: 'error' }),
    [src, authoredSrcSet]
  );

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
        {
          // An empty `src` requests the document URL, so leave the attribute off.
          src: src || undefined,
          onLoad: handleLoad,
          onError: handleError,
        },
      ],
    }
  );
});

export namespace Poster {
  export type Props = PosterProps;
  export type State = PosterCore.State;
}

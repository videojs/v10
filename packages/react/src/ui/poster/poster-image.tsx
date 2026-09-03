import type { PosterCore, PosterImageLoadState } from '@videojs/core';
import type { ForwardedRef } from 'react';
import { forwardRef, useEffect, useRef, useState } from 'react';

import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { usePosterContext } from './context';

export interface PosterImageProps extends UIComponentProps<'img', PosterCore.State> {}

/** The source currently requested from the image, and how it is faring. */
interface ImageRequest {
  src: string;
  srcSet: string | undefined;
  state: PosterImageLoadState;
}

/**
 * Displays the poster image managed by `Poster.Root`.
 *
 * Renders an `img`, so `srcSet`, `sizes`, `loading`, and the rest of the native image attributes remain available.
 * Leave the source off and the player's resolved poster fills it in. The image is decorative unless you supply `alt`.
 */
export const PosterImage = forwardRef(function PosterImage(
  componentProps: PosterImageProps,
  forwardedRef: ForwardedRef<HTMLImageElement>
) {
  const { render, className, style, ...elementProps } = componentProps;
  const { state, setImageLoadState } = usePosterContext();

  const { src: authoredSrc, srcSet: authoredSrcSet } = elementProps;

  // Either authored source makes the image yours, matching `hasSource` in the
  // HTML element. Filling `src` alongside a `srcset` would inject the player's
  // poster into your candidate set as the 1x entry.
  const src = authoredSrc ?? (authoredSrcSet === undefined ? state.src : '');

  const initialLoadState: PosterImageLoadState = !src && authoredSrcSet === undefined ? 'none' : 'loading';
  const [request, setRequest] = useState<ImageRequest>(() => ({
    src,
    srcSet: authoredSrcSet,
    state: initialLoadState,
  }));
  const imgRef = useRef<HTMLImageElement | null>(null);
  const didCheckInitialImageRef = useRef(false);

  // Keep only the active request. Retaining a settled source by value would
  // resurrect its old state when the image moved A -> B -> A, even though the
  // second A is a new request. `srcSet` is part of the identity because `src`
  // stays empty when it is the only source.
  const matchesRequest = request.src === src && request.srcSet === authoredSrcSet;

  if (!matchesRequest) setRequest({ src, srcSet: authoredSrcSet, state: initialLoadState });

  const loadState = matchesRequest ? request.state : initialLoadState;

  useEffect(() => {
    setImageLoadState(loadState);
  }, [authoredSrcSet, loadState, setImageLoadState, src]);

  useEffect(() => () => setImageLoadState('none'), [setImageLoadState]);

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
  useEffect(() => {
    if (didCheckInitialImageRef.current) return;

    didCheckInitialImageRef.current = true;

    const img = imgRef.current;
    if (!img) return;

    if (img.naturalWidth > 0) setRequest({ src, srcSet: authoredSrcSet, state: 'loaded' });
    else if (img.complete && (img.getAttribute('src') || img.hasAttribute('srcset'))) {
      setRequest({ src, srcSet: authoredSrcSet, state: 'error' });
    }
  }, [authoredSrcSet, src]);

  // Recorded against the source this render asked for, not the one on the
  // element: a `render` override is free to rewrite it.
  const handleLoad = () => setRequest({ src, srcSet: authoredSrcSet, state: 'loaded' });
  const handleError = () => setRequest({ src, srcSet: authoredSrcSet, state: 'error' });

  return renderElement(
    'img',
    { render, className, style },
    {
      state,
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

export namespace PosterImage {
  export type Props = PosterImageProps;
}

'use client';

import { PosterCore, PosterDataAttrs } from '@videojs/core';
import { logMissingFeature, selectPlayback } from '@videojs/core/dom';
import type { ForwardedRef, SyntheticEvent } from 'react';
import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';

import { usePlayer } from '../../player/context';
import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';

export interface PosterProps extends UIComponentProps<'img', PosterCore.State> {}

/**
 * Displays the video poster image. Shows before playback starts, hides after.
 *
 * @example
 * ```tsx
 * <Poster src="poster.jpg" alt="Video description" />
 *
 * <Poster
 *   src="poster.jpg"
 *   alt="Video description"
 *   className={(state) => state.visible ? 'visible' : 'hidden'}
 * />
 * ```
 */
export const Poster = forwardRef(function Poster(
  componentProps: PosterProps,
  forwardedRef: ForwardedRef<HTMLImageElement>
) {
  const { render, className, style, ...elementProps } = componentProps;

  const playback = usePlayer(selectPlayback);

  const [core] = useState(() => new PosterCore());

  // Track when the current src has finished loading so the CSS blur-up
  // sequence can show the placeholder first, then crossfade to the full image.
  const src = (elementProps as { src?: string }).src;
  const [loadedSrc, setLoadedSrc] = useState<string | undefined>(undefined);
  const loaded = loadedSrc === src;
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

  if (!playback) {
    if (__DEV__) logMissingFeature('Poster', 'playback');
    return null;
  }

  core.setMedia(playback);

  return renderElement(
    'img',
    { render, className, style },
    {
      state: core.getState(),
      stateAttrMap: PosterDataAttrs,
      ref: [forwardedRef, imgRef],
      props: [elementProps, { 'data-loaded': loaded ? '' : undefined, onLoad: handleLoad }],
    }
  );
});

export namespace Poster {
  export type Props = PosterProps;
  export type State = PosterCore.State;
}

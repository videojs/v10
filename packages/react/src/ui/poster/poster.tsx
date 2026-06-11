'use client';

import { PosterCore, PosterDataAttrs } from '@videojs/core';
import { logMissingFeature, selectPlayback } from '@videojs/core/dom';
import { isFunction } from '@videojs/utils/predicate';
import type { CSSProperties, ForwardedRef } from 'react';
import { forwardRef, useCallback, useState } from 'react';

import { usePlayer } from '../../player/context';
import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';

export interface PosterProps extends UIComponentProps<'img', PosterCore.State> {
  /** Low-resolution placeholder shown behind the poster while it loads (blur-up effect). */
  placeholder?: string | undefined;
}

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
  const { render, className, style, placeholder, ...elementProps } = componentProps;

  const playback = usePlayer(selectPlayback);

  const [core] = useState(() => new PosterCore());

  // Track when the current src has finished loading so the CSS blur-up
  // sequence can show the placeholder first, then crossfade to the full image.
  const src = (elementProps as { src?: string }).src;
  const [loadedSrc, setLoadedSrc] = useState<string | undefined>(undefined);
  const loaded = loadedSrc === src;
  const handleLoad = useCallback(() => setLoadedSrc(src), [src]);

  if (!playback) {
    if (__DEV__) logMissingFeature('Poster', 'playback');
    return null;
  }

  core.setMedia(playback);

  const resolvedStyle: typeof style = placeholder
    ? (state) =>
        ({
          '--media-poster-placeholder': `url(${placeholder})`,
          ...(isFunction(style) ? style(state) : style),
        }) as CSSProperties
    : style;

  return renderElement(
    'img',
    { render, className, style: resolvedStyle },
    {
      state: core.getState(),
      stateAttrMap: PosterDataAttrs,
      ref: [forwardedRef],
      props: [elementProps, { 'data-loaded': loaded ? '' : undefined, onLoad: handleLoad }],
    }
  );
});

export namespace Poster {
  export type Props = PosterProps;
  export type State = PosterCore.State;
}

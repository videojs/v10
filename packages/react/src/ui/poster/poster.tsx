'use client';

import { PosterCore, PosterDataAttrs } from '@videojs/core';
import { logMissingFeature, selectPlayback } from '@videojs/core/dom';
import type { ForwardedRef } from 'react';
import { forwardRef, useState } from 'react';

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

  if (!playback) {
    if (__DEV__) logMissingFeature('Poster', 'playback');
    return null;
  }

  return renderElement(
    'img',
    { render, className, style },
    {
      state: core.getState(playback),
      stateAttrMap: PosterDataAttrs,
      ref: [forwardedRef],
      props: [elementProps],
    }
  );
});

export namespace Poster {
  export type Props = PosterProps;
  export type State = PosterCore.State;
}

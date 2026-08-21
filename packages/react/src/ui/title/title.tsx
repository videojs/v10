'use client';

import { TitleCore, TitleDataAttrs } from '@videojs/core';
import { selectMetadata } from '@videojs/core/dom';
import type { ForwardedRef } from 'react';
import { forwardRef } from 'react';

import { usePlayer } from '../../player/context';
import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { useLogMissingFeature } from '../hooks/use-log-missing-feature';

const titleCore = new TitleCore();

export interface TitleProps extends Omit<UIComponentProps<'span', TitleCore.State>, 'children'> {}

/**
 * Displays the resolved content title.
 *
 * The component owns its text content. Set the title through the player's
 * `title` prop rather than by passing children.
 *
 * Renders nothing when no title resolves.
 *
 * @example
 * ```tsx
 * <Title />
 *
 * <Title className="title" />
 * ```
 */
export const Title = forwardRef(function Title(
  componentProps: TitleProps,
  forwardedRef: ForwardedRef<HTMLSpanElement>
) {
  const { render, className, style, ...elementProps } = componentProps;

  const metadata = usePlayer(selectMetadata);

  useLogMissingFeature(!metadata, 'Title', 'metadata');

  if (!metadata) {
    return null;
  }

  const state = titleCore.getState(metadata);

  if (state.hidden) return null;

  return renderElement(
    'span',
    { render, className, style },
    {
      state,
      stateAttrMap: TitleDataAttrs,
      ref: [forwardedRef],
      props: [{ children: state.title }, elementProps],
    }
  );
});

export namespace Title {
  export type Props = TitleProps;
  export type State = TitleCore.State;
}

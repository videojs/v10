'use client';

import { TitleCore, TitleDataAttrs } from '@videojs/core';
import { logMissingFeature, selectMetadata } from '@videojs/core/dom';
import type { ForwardedRef } from 'react';
import { forwardRef, useState } from 'react';

import { usePlayer } from '../../player/context';
import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';

export interface ValueProps extends Omit<UIComponentProps<'span', TitleCore.State>, 'children'>, TitleCore.Props {}

/**
 * Displays the current media title.
 *
 * @example
 * ```tsx
 * <Title.Value />
 * ```
 */
export const Value = forwardRef(function Value(
  componentProps: ValueProps,
  forwardedRef: ForwardedRef<HTMLSpanElement>
) {
  const { render, className, style, label, ...elementProps } = componentProps;

  const metadata = usePlayer(selectMetadata);

  const [core] = useState(() => new TitleCore());
  core.setProps({ label });

  if (!metadata) {
    if (__DEV__) logMissingFeature('Title.Value', 'metadata');
    return null;
  }

  core.setMedia(metadata);
  const state = core.getState();

  return renderElement(
    'span',
    { render, className, style },
    {
      state,
      stateAttrMap: TitleDataAttrs,
      ref: [forwardedRef],
      props: [
        {
          children: state.text,
          ...core.getAttrs(state),
        },
        elementProps,
      ],
    }
  );
});

export namespace Value {
  export type Props = ValueProps;
  export type State = TitleCore.State;
}

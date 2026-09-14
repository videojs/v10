'use client';

import { TitleCore, TitleDataAttrs } from '@videojs/core';
import { logMissingFeature, selectControls, selectMetadata } from '@videojs/core/dom';
import type { ForwardedRef } from 'react';
import { forwardRef, useState } from 'react';

import { usePlayer } from '../../player/context';
import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { TitleProvider } from './context';

export interface TitleRootProps extends UIComponentProps<'div', TitleCore.State> {}

/**
 * Groups title content and reflects its visibility. Renders nothing when no title resolves.
 *
 * @example
 *   ```tsx
 *   <Title.Root><Title.Value /></Title.Root>
 *   ```;
 */
export const TitleRoot = forwardRef(function TitleRoot(
  componentProps: TitleRootProps,
  forwardedRef: ForwardedRef<HTMLDivElement>
) {
  const { render, className, style, ...elementProps } = componentProps;

  const metadata = usePlayer(selectMetadata);
  const controls = usePlayer(selectControls);

  const [core] = useState(() => new TitleCore());

  if (!metadata) {
    if (__DEV__) logMissingFeature('Title', 'metadata');

    return null;
  }

  const state = core.getState(metadata);
  if (state.hidden) return null;

  return (
    <TitleProvider value={{ state }}>
      {renderElement(
        'div',
        { render, className, style },
        {
          state,
          stateAttrMap: TitleDataAttrs,
          ref: [forwardedRef],
          props: [{ 'data-visible': controls?.controlsVisible ? '' : undefined }, elementProps],
        }
      )}
    </TitleProvider>
  );
});

export namespace TitleRoot {
  export type Props = TitleRootProps;
  export type State = TitleCore.State;
}

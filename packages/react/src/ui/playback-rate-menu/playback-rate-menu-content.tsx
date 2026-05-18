'use client';

import { type PlaybackRateMenuCore, PlaybackRateMenuDataAttrs } from '@videojs/core';
import { forwardRef } from 'react';

import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { MenuContent } from '../menu/menu-content';
import { usePlaybackRateMenuContext } from './context';

export interface PlaybackRateMenuContentProps extends UIComponentProps<'div', PlaybackRateMenuCore.State> {}

export const PlaybackRateMenuContent = forwardRef<HTMLDivElement, PlaybackRateMenuContentProps>(
  function PlaybackRateMenuContent({ render, className, style, children, ...elementProps }, forwardedRef) {
    const { state } = usePlaybackRateMenuContext();

    return (
      <MenuContent
        render={(menuProps) =>
          renderElement(
            'div',
            { render, className, style },
            {
              state,
              stateAttrMap: PlaybackRateMenuDataAttrs,
              ref: [forwardedRef],
              props: [menuProps, elementProps],
            }
          )
        }
      >
        {children}
      </MenuContent>
    );
  }
);

export namespace PlaybackRateMenuContent {
  export type Props = PlaybackRateMenuContentProps;
  export type State = PlaybackRateMenuCore.State;
}

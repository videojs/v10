'use client';

import { type CaptionsMenuCore, CaptionsMenuDataAttrs } from '@videojs/core';
import { forwardRef } from 'react';

import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { MenuContent } from '../menu/menu-content';
import { useCaptionsMenuContext } from './context';

export interface CaptionsMenuContentProps extends UIComponentProps<'div', CaptionsMenuCore.State> {}

export const CaptionsMenuContent = forwardRef<HTMLDivElement, CaptionsMenuContentProps>(function CaptionsMenuContent(
  { render, className, style, children, ...elementProps },
  forwardedRef
) {
  const { state } = useCaptionsMenuContext();

  return (
    <MenuContent
      render={(menuProps) =>
        renderElement(
          'div',
          { render, className, style },
          {
            state,
            stateAttrMap: CaptionsMenuDataAttrs,
            ref: [forwardedRef],
            props: [menuProps, elementProps],
          }
        )
      }
    >
      {children}
    </MenuContent>
  );
});

export namespace CaptionsMenuContent {
  export type Props = CaptionsMenuContentProps;
  export type State = CaptionsMenuCore.State;
}

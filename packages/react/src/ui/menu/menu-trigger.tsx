'use client';

import type { MenuState } from '@videojs/core';
import { supportsAnchorPositioning } from '@videojs/utils/dom';
import { forwardRef, useCallback } from 'react';

import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { useMenuContext } from './context';

export interface MenuTriggerProps extends UIComponentProps<'button', MenuState> {}

/** Button that toggles the menu visibility. Renders a `<button>` element. */
export const MenuTrigger = forwardRef<HTMLButtonElement, MenuTriggerProps>(function MenuTrigger(
  { render, className, style, ...elementProps },
  forwardedRef
) {
  const { core, menu, state, stateAttrMap, anchorName, contentId } = useMenuContext();

  const triggerRef = useCallback(
    (element: HTMLButtonElement | null) => {
      menu.setTriggerElement(element);
      if (element && supportsAnchorPositioning()) {
        element.style.setProperty('anchor-name', `--${anchorName}`);
      }
    },
    [menu, anchorName]
  );

  return renderElement(
    'button',
    { render, className, style },
    {
      state,
      stateAttrMap,
      ref: [forwardedRef, triggerRef],
      props: [{ type: 'button' as const, ...core.getTriggerAttrs(state, contentId) }, menu.triggerProps, elementProps],
    }
  );
});

export namespace MenuTrigger {
  export type Props = MenuTriggerProps;
  export type State = MenuState;
}

'use client';

import type { MenuState } from '@videojs/core';
import { isMenuNavigationKey } from '@videojs/core/dom';
import { forwardRef, useCallback, useMemo } from 'react';

import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { MenuTriggerChildContextProvider, useMenuContext } from './context';
import { toUIKeyboardEvent } from './menu-events';

export interface MenuTriggerProps extends Omit<UIComponentProps<'button', MenuState>, 'type'> {
  /** Disables the trigger. */
  disabled?: boolean;
}

function preventMenuKeyDefault(event: React.KeyboardEvent<HTMLElement>): void {
  const keyboardEvent = toUIKeyboardEvent(event);

  if (
    event.key !== 'Escape' &&
    event.key !== 'ArrowLeft' &&
    event.key !== 'ArrowRight' &&
    isMenuNavigationKey(keyboardEvent) &&
    !event.defaultPrevented
  ) {
    event.preventDefault();
  }
}

/** Button that toggles an independent menu. */
export const MenuTrigger = forwardRef<HTMLButtonElement, MenuTriggerProps>(function MenuTrigger(
  { render, className, style, disabled, ...elementProps },
  forwardedRef
) {
  const { core, menu, state, contentId } = useMenuContext();

  const triggerRef = useCallback(
    (element: HTMLButtonElement | null) => {
      menu.setTriggerElement(element);
    },
    [menu]
  );

  const triggerProps = useMemo(() => {
    if (!disabled) return menu.triggerProps;

    return {
      onClick: (event: React.MouseEvent<HTMLElement>) => {
        event.preventDefault();
      },
      onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
        const keyboardEvent = toUIKeyboardEvent(event);
        if (event.key === 'Enter' || event.key === ' ' || isMenuNavigationKey(keyboardEvent)) {
          event.preventDefault();
        }
      },
    };
  }, [disabled, menu.triggerProps]);

  return (
    <MenuTriggerChildContextProvider value>
      {renderElement(
        'button',
        { render, className, style },
        {
          state,
          ref: [forwardedRef, triggerRef],
          props: [
            { type: 'button' as const, ...core.getTriggerAttrs(state, contentId) },
            disabled ? { disabled: true, 'aria-disabled': 'true' as const } : undefined,
            state.open ? { onKeyDownCapture: preventMenuKeyDefault } : undefined,
            triggerProps,
            elementProps,
          ],
        }
      )}
    </MenuTriggerChildContextProvider>
  );
});

export namespace MenuTrigger {
  export type Props = MenuTriggerProps;
  export type State = MenuState;
}

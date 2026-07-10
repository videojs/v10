'use client';

import type { MenuState } from '@videojs/core';
import { resolveTranslation } from '@videojs/core/i18n';
import { forwardRef, useCallback } from 'react';

import { useTranslator } from '../../i18n/context';
import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { useSubMenuContext } from './context';

export interface MenuBackProps extends UIComponentProps<'button', MenuState> {
  /** Accessible label for the back button. */
  label?: string;
}

/** Button that navigates back to the parent menu view. Place at the top of a submenu Content. */
export const MenuBack = forwardRef<HTMLButtonElement, MenuBackProps>(function MenuBack(
  { render, className, style, label = 'Back', onClick, ...elementProps },
  forwardedRef
) {
  const t = useTranslator();
  const subMenuCtx = useSubMenuContext();
  const parentMenu = subMenuCtx?.parentMenu ?? null;

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);
      parentMenu?.pop();
    },
    [onClick, parentMenu]
  );

  return renderElement(
    'button',
    { render, className, style },
    {
      state: parentMenu?.state ?? ({} as MenuState),
      ref: forwardedRef,
      props: [
        {
          type: 'button' as const,
          'aria-label': resolveTranslation(t, label),
          onClick: handleClick,
        },
        elementProps,
      ],
    }
  );
});

export namespace MenuBack {
  export type Props = MenuBackProps;
  export type State = MenuState;
}

'use client';

import type { AlertDialogCore } from '@videojs/core';
import { forwardRef, useCallback } from 'react';

import type { UIComponentProps } from '../../utils/types';
import { useComposedRefs } from '../../utils/use-composed-refs';
import { renderElement } from '../../utils/use-render';
import { useAlertDialogContext } from './context';

export interface AlertDialogPopupProps extends UIComponentProps<'div', AlertDialogCore.State> {}

export const AlertDialogPopup = forwardRef<HTMLDivElement, AlertDialogPopupProps>(function AlertDialogPopup(
  { render, className, style, ...elementProps },
  forwardedRef
) {
  const { core, dialog, state, stateAttrMap } = useAlertDialogContext();

  const elementRef = useCallback(
    (el: HTMLDivElement | null) => {
      dialog.setElement(el);
    },
    [dialog]
  );

  const composedRef = useComposedRefs(forwardedRef, elementRef);

  if (!state.open) return null;

  return renderElement(
    'div',
    { render, className, style },
    {
      state,
      stateAttrMap,
      ref: composedRef,
      props: [{ tabIndex: -1, ...core.getAttrs(state) }, elementProps],
    }
  );
});

export namespace AlertDialogPopup {
  export type Props = AlertDialogPopupProps;
  export type State = AlertDialogCore.State;
}

import type { AlertDialogCore } from '@videojs/core';
import { forwardRef } from 'react';

import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { useAlertDialogContext } from './context';

export interface AlertDialogBackdropProps extends UIComponentProps<'div', AlertDialogCore.State> {}

/**
 * Presentational layer behind an open alert dialog. Renders a `<div>` while the dialog is present, including its exit
 * transition, and receives the dialog state data attributes.
 */
export const AlertDialogBackdrop = forwardRef<HTMLDivElement, AlertDialogBackdropProps>(function AlertDialogBackdrop(
  { render, className, style, ...elementProps },
  forwardedRef
) {
  const { state, stateAttrMap } = useAlertDialogContext();
  if (!state.open) return null;

  return renderElement(
    'div',
    { render, className, style },
    {
      state,
      stateAttrMap,
      ref: [forwardedRef],
      props: [{ role: 'presentation', 'aria-hidden': true }, elementProps],
    }
  );
});

export namespace AlertDialogBackdrop {
  export type Props = AlertDialogBackdropProps;
  export type State = AlertDialogCore.State;
}

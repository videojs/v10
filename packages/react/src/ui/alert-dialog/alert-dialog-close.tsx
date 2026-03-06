'use client';

import type { AlertDialogCore } from '@videojs/core';
import { forwardRef, useCallback } from 'react';

import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { useAlertDialogContext } from './context';

export interface AlertDialogCloseProps extends UIComponentProps<'button', AlertDialogCore.State> {}

export const AlertDialogClose = forwardRef<HTMLButtonElement, AlertDialogCloseProps>(function AlertDialogClose(
  { render, className, style, disabled, ...elementProps },
  forwardedRef
) {
  const { dialog, state } = useAlertDialogContext();

  const handleClick = useCallback(() => {
    if (disabled) return;
    dialog.close();
  }, [dialog, disabled]);

  return renderElement(
    'button',
    { render, className, style },
    {
      state,
      ref: [forwardedRef],
      props: [{ type: 'button' as const, disabled, onClick: handleClick }, elementProps],
    }
  );
});

export namespace AlertDialogClose {
  export type Props = AlertDialogCloseProps;
  export type State = AlertDialogCore.State;
}

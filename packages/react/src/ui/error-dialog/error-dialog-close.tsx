'use client';

import type { AlertDialogCore } from '@videojs/core';
import { getErrorDialogDismissLabel } from '@videojs/core';
import { resolveTranslation } from '@videojs/core/i18n';
import { forwardRef, type ReactNode, useCallback } from 'react';
import { useTranslator } from '../../i18n/context';
import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { useAlertDialogContext } from '../alert-dialog/context';

export interface ErrorDialogCloseProps extends UIComponentProps<'button', AlertDialogCore.State> {}

export const ErrorDialogClose = forwardRef<HTMLButtonElement, ErrorDialogCloseProps>(function ErrorDialogClose(
  { render, className, style, disabled, children, ...elementProps },
  forwardedRef
) {
  const t = useTranslator();
  const { dialog, state, stateAttrMap } = useAlertDialogContext();

  const handleClick = useCallback(() => {
    if (disabled) return;
    dialog.close();
  }, [dialog, disabled]);

  const content: ReactNode = children ?? resolveTranslation(t, getErrorDialogDismissLabel());

  return renderElement(
    'button',
    { render, className, style },
    {
      state,
      stateAttrMap,
      ref: forwardedRef,
      props: [{ type: 'button' as const, disabled, onClick: handleClick, children: content }, elementProps],
    }
  );
});

export namespace ErrorDialogClose {
  export type Props = ErrorDialogCloseProps;
  export type State = AlertDialogCore.State;
}

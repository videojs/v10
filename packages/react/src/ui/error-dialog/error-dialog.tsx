'use client';

import type { ForwardedRef } from 'react';
import { forwardRef, useEffect, useRef, useState } from 'react';
import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';

type ErrorDialogState = { visible: boolean; onDismiss: () => void };

export interface ErrorDialogProps extends UIComponentProps<'div', ErrorDialogState> {
  'aria-labelledby': string;
  'aria-describedby'?: string;
  dismiss?: () => void;
}

const DEBUG = false;

/**
 * Displays an error dialog when media playback encounters an error.
 *
 * @example
 * ```tsx
 * <ErrorDialog />
 *
 * <ErrorDialog
 *   render={(props, state) => (
 *     <div {...props}>Something went wrong</div>
 *   )}
 * />
 * ```
 */
export const ErrorDialog = forwardRef(function ErrorDialog(
  componentProps: ErrorDialogProps,
  forwardedRef: ForwardedRef<HTMLDivElement>
) {
  const { render, className, style, ...elementProps } = componentProps;
  const dialogRef = useRef<HTMLDivElement>(null);

  const [hasError, setHasError] = useState(false);

  // FIXME: This is just debugging code
  useEffect(() => {
    const handle = setTimeout(() => {
      if (!DEBUG) return;
      setHasError(true);
    }, 2000);

    return () => clearTimeout(handle);
  }, []);

  // Focus the dialog when it becomes visible to ensure it's announced by screen readers.
  // Wait a frame for the accessibility tree to update with the dialog before focusing.
  useEffect(() => {
    if (!hasError) return;
    requestAnimationFrame(() => {
      dialogRef.current?.focus();
    });
  }, [hasError]);

  return renderElement(
    'div',
    { render, className, style },
    {
      state: {
        visible: hasError,
        onDismiss: () => setHasError(false),
      },
      ref: [forwardedRef, dialogRef],
      props: [
        {
          role: 'alertdialog',
          tabIndex: -1,
        },
        elementProps,
      ],
    }
  );
});

export namespace ErrorDialog {
  export type Props = ErrorDialogProps;
  export type State = ErrorDialogState;
}

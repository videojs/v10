import { ErrorDialogCore, ErrorDialogDataAttrs } from '@videojs/core';
import { selectError } from '@videojs/core/dom';
import type { ReactNode } from 'react';
import { useRef } from 'react';

import { usePlayer } from '../../player/context';
import { useLatestRef } from '../../utils/use-latest-ref';
import { DialogContextProvider } from '../dialog/context';
import { useDialogRoot } from '../dialog/use-dialog-root';
import { ErrorDialogContextProvider } from './context';

export interface ErrorDialogRootProps {
  children?: ReactNode;
}

/** Opens from player error state and provides it to the shared dialog parts. */
export function ErrorDialogRoot({ children }: ErrorDialogRootProps): ReactNode {
  const errorState = usePlayer(selectError);
  const lastError = useRef(errorState?.error ?? null);

  if (errorState?.error) lastError.current = errorState.error;

  const errorStateRef = useLatestRef(errorState);
  const dialogContext = useDialogRoot({
    open: Boolean(errorState?.error),
    onOpenChange(nextOpen) {
      if (!nextOpen) errorStateRef.current?.dismissError();
    },
    coreFactory: createErrorDialogCore,
    stateAttrMap: ErrorDialogDataAttrs,
    idPrefix: 'error-dialog',
  });

  if (!errorState) return null;

  return (
    <ErrorDialogContextProvider value={{ lastError: lastError.current }}>
      <DialogContextProvider value={dialogContext}>{children}</DialogContextProvider>
    </ErrorDialogContextProvider>
  );
}

function createErrorDialogCore(): ErrorDialogCore {
  return new ErrorDialogCore();
}

export namespace ErrorDialogRoot {
  export type Props = ErrorDialogRootProps;
}

import { AlertDialogDataAttrs, ErrorDialogCore } from '@videojs/core';
import { createAlertDialog, createTransition, selectError } from '@videojs/core/dom';
import { useSnapshot } from '@videojs/store/react';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

import { usePlayer } from '../../player/context';
import { useCommittedRef } from '../../utils/use-committed-ref';
import { useDestroy } from '../../utils/use-destroy';
import { useIsomorphicLayoutEffect } from '../../utils/use-isomorphic-layout-effect';
import { useSafeId } from '../../utils/use-safe-id';
import { AlertDialogContextProvider } from '../alert-dialog/context';
import { ErrorDialogContextProvider } from './context';

export interface ErrorDialogRootProps {
  children?: ReactNode;
}

export function ErrorDialogRoot({ children }: ErrorDialogRootProps): ReactNode {
  const errorState = usePlayer(selectError);
  const lastErrorRef = useRef(errorState?.error ?? null);
  const lastError = errorState?.error ?? lastErrorRef.current;

  useIsomorphicLayoutEffect(() => {
    if (errorState?.error) lastErrorRef.current = errorState.error;
  }, [errorState?.error]);

  const errorStateRef = useCommittedRef(errorState);

  const [dialog] = useState(() =>
    createAlertDialog({
      transition: createTransition(),
      onOpenChange: (nextOpen: boolean) => {
        if (!nextOpen) {
          errorStateRef.current?.dismissError();
        }
      },
    })
  );

  const titleId = useSafeId('error-dialog-title');
  const descriptionId = useSafeId('error-dialog-desc');

  useEffect(() => {
    const hasError = Boolean(errorState?.error);
    const { active: isOpen } = dialog.input.current;

    if (hasError && !isOpen) {
      dialog.open();
    } else if (!hasError && isOpen) {
      dialog.close();
    }
  }, [errorState?.error, dialog]);

  useDestroy(dialog);

  const input = useSnapshot(dialog.input);
  const core = new ErrorDialogCore();
  core.setInput(input);
  core.setTitleId(titleId);
  core.setDescriptionId(descriptionId);
  const state = core.getState();

  if (!errorState) return null;

  return (
    <ErrorDialogContextProvider value={{ lastError }}>
      <AlertDialogContextProvider value={{ core, dialog, state, stateAttrMap: AlertDialogDataAttrs }}>
        {children}
      </AlertDialogContextProvider>
    </ErrorDialogContextProvider>
  );
}

export namespace ErrorDialogRoot {
  export type Props = ErrorDialogRootProps;
}

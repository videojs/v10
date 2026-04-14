'use client';

import { AlertDialogDataAttrs, ErrorDialogCore } from '@videojs/core';
import { createAlertDialog, createTransition, selectError } from '@videojs/core/dom';
import { useSnapshot } from '@videojs/store/react';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

import { usePlayer } from '../../player/context';
import { useDestroy } from '../../utils/use-destroy';
import { useLatestRef } from '../../utils/use-latest-ref';
import { useSafeId } from '../../utils/use-safe-id';
import { AlertDialogContextProvider } from '../alert-dialog/context';
import { ErrorDialogContextProvider } from './context';

export interface ErrorDialogRootProps {
  children?: ReactNode;
}

export function ErrorDialogRoot({ children }: ErrorDialogRootProps): ReactNode {
  const [core] = useState(() => new ErrorDialogCore());
  const errorState = usePlayer(selectError);
  const lastError = useRef(errorState?.error ?? null);

  if (errorState?.error) lastError.current = errorState.error;

  const errorStateRef = useLatestRef(errorState);

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

  core.setTitleId(titleId);
  core.setDescriptionId(descriptionId);

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
  core.setInput(input);
  const state = core.getState();

  if (!errorState) return null;

  return (
    <ErrorDialogContextProvider value={{ lastError: lastError.current }}>
      <AlertDialogContextProvider value={{ core, dialog, state, stateAttrMap: AlertDialogDataAttrs }}>
        {children}
      </AlertDialogContextProvider>
    </ErrorDialogContextProvider>
  );
}

export namespace ErrorDialogRoot {
  export type Props = ErrorDialogRootProps;
}

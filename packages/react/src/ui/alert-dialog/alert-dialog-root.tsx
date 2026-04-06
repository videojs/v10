'use client';

import { AlertDialogCore, AlertDialogDataAttrs, type AlertDialogProps } from '@videojs/core';
import { createAlertDialog, createTransition } from '@videojs/core/dom';
import { useSnapshot } from '@videojs/store/react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

import { useDestroy } from '../../utils/use-destroy';
import { useLatestRef } from '../../utils/use-latest-ref';
import { useSafeId } from '../../utils/use-safe-id';
import { AlertDialogContextProvider } from './context';

export interface AlertDialogRootProps extends AlertDialogProps {
  /** Called when the open state changes (fires immediately, before animations). */
  onOpenChange?: (open: boolean) => void;
  /** Called after open/close animations complete. */
  onOpenChangeComplete?: (open: boolean) => void;
  children?: ReactNode;
}

export function AlertDialogRoot({
  open: controlledOpen,
  defaultOpen = AlertDialogCore.defaultProps.defaultOpen,
  onOpenChange: onOpenChangeProp,
  onOpenChangeComplete: onOpenChangeCompleteProp,
  children,
}: AlertDialogRootProps): ReactNode {
  const [core] = useState(() => new AlertDialogCore());

  const isControlled = controlledOpen !== undefined;

  const onOpenChangeRef = useLatestRef(onOpenChangeProp);
  const onOpenChangeCompleteRef = useLatestRef(onOpenChangeCompleteProp);

  const [dialog] = useState(() => {
    const instance = createAlertDialog({
      transition: createTransition(),
      onOpenChange: (nextOpen: boolean) => {
        onOpenChangeRef.current?.(nextOpen);
      },
      onOpenChangeComplete: (nextOpen: boolean) => {
        onOpenChangeCompleteRef.current?.(nextOpen);
      },
    });

    if (!isControlled && defaultOpen) {
      instance.open();
    }

    return instance;
  });

  const titleId = useSafeId('alert-dialog-title');
  const descriptionId = useSafeId('alert-dialog-desc');

  core.setTitleId(titleId);
  core.setDescriptionId(descriptionId);

  // Sync controlled open prop -> internal input state.
  useEffect(() => {
    if (controlledOpen === undefined) return;

    const { active: inputOpen } = dialog.input.current;
    if (controlledOpen === inputOpen) return;

    if (controlledOpen) {
      dialog.open();
    } else {
      dialog.close();
    }
  }, [controlledOpen, dialog]);

  useDestroy(dialog);

  const input = useSnapshot(dialog.input);
  core.setInput(input);
  const state = core.getState();

  return (
    <AlertDialogContextProvider value={{ core, dialog, state, stateAttrMap: AlertDialogDataAttrs }}>
      {children}
    </AlertDialogContextProvider>
  );
}

export namespace AlertDialogRoot {
  export type Props = AlertDialogRootProps;
}

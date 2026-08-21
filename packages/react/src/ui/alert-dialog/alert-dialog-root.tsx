import { AlertDialogCore, AlertDialogDataAttrs, type AlertDialogProps } from '@videojs/core';
import { createAlertDialog, createTransition } from '@videojs/core/dom';
import { useSnapshot } from '@videojs/store/react';
import type { ReactNode } from 'react';
import { useLayoutEffect, useRef, useState } from 'react';

import { useCommittedRef } from '../../utils/use-committed-ref';
import { useDestroy } from '../../utils/use-destroy';
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
  const isControlled = controlledOpen !== undefined;
  const initialOpenRef = useRef(!isControlled && defaultOpen);

  const onOpenChangeRef = useCommittedRef(onOpenChangeProp);
  const onOpenChangeCompleteRef = useCommittedRef(onOpenChangeCompleteProp);

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

    return instance;
  });

  const titleId = useSafeId('alert-dialog-title');
  const descriptionId = useSafeId('alert-dialog-desc');

  // Commit the initial uncontrolled default or the current controlled value.
  // Keeping this out of the initializer prevents server/abandoned renders from
  // reading focus, scheduling animation frames, or notifying consumers.
  useLayoutEffect(() => {
    let nextOpen = controlledOpen;
    if (nextOpen === undefined) {
      if (!initialOpenRef.current) return;
      initialOpenRef.current = false;
      nextOpen = true;
    }

    const { active: inputOpen } = dialog.input.current;
    if (nextOpen === inputOpen) return;

    if (nextOpen) {
      dialog.open();
    } else {
      dialog.close();
    }
  }, [controlledOpen, dialog]);

  useDestroy(dialog);

  const input = useSnapshot(dialog.input);
  const core = new AlertDialogCore();
  core.setInput(input);
  core.setTitleId(titleId);
  core.setDescriptionId(descriptionId);
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

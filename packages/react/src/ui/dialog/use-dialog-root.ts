import { DialogCore, DialogDataAttrs, type DialogProps, type DialogState, type StateAttrMap } from '@videojs/core';
import { createDialog, createTransition } from '@videojs/core/dom';
import { useSnapshot } from '@videojs/store/react';
import { useLayoutEffect, useRef, useState } from 'react';

import { useDestroy } from '../../utils/use-destroy';
import { useIsomorphicLayoutEffect } from '../../utils/use-isomorphic-layout-effect';
import { useLatestRef } from '../../utils/use-latest-ref';
import { useSafeId } from '../../utils/use-safe-id';
import type { DialogContextValue } from './context';

export interface UseDialogRootOptions extends DialogProps {
  onOpenChange?: (open: boolean) => void;
  onOpenChangeComplete?: (open: boolean) => void;
  coreFactory?: () => DialogCore;
  stateAttrMap?: StateAttrMap<DialogState>;
  idPrefix?: string;
  interactionRoot?: HTMLElement | null;
}

export function useDialogRoot({
  open: controlledOpen,
  defaultOpen = DialogCore.defaultProps.defaultOpen,
  closeOnEscape = DialogCore.defaultProps.closeOnEscape,
  onOpenChange: onOpenChangeProp,
  onOpenChangeComplete: onOpenChangeCompleteProp,
  coreFactory = createDialogCore,
  stateAttrMap = DialogDataAttrs,
  idPrefix = 'dialog',
  interactionRoot,
}: UseDialogRootOptions): DialogContextValue {
  const isControlled = controlledOpen !== undefined;
  const initialOpenRef = useRef(!isControlled && defaultOpen);
  const onOpenChangeRef = useLatestRef(onOpenChangeProp);
  const onOpenChangeCompleteRef = useLatestRef(onOpenChangeCompleteProp);
  const closeOnEscapeRef = useLatestRef(closeOnEscape);

  const [dialog] = useState(() =>
    createDialog({
      transition: createTransition(),
      onOpenChange: (nextOpen: boolean) => onOpenChangeRef.current?.(nextOpen),
      onOpenChangeComplete: (nextOpen: boolean) => onOpenChangeCompleteRef.current?.(nextOpen),
      closeOnEscape: () => closeOnEscapeRef.current,
    })
  );

  const popupId = useSafeId(`${idPrefix}-popup`);
  const titleId = useSafeId(`${idPrefix}-title`);
  const descriptionId = useSafeId(`${idPrefix}-desc`);

  useLayoutEffect(() => {
    dialog.setInteractionRoot(interactionRoot ?? null);
  }, [dialog, interactionRoot]);

  // Commit the initial uncontrolled default or the current controlled value.
  // Keeping this out of the initializer prevents server and abandoned renders
  // from reading focus, scheduling animation frames, or notifying consumers.
  useIsomorphicLayoutEffect(() => {
    let nextOpen = controlledOpen;

    if (nextOpen === undefined) {
      if (!initialOpenRef.current) return;

      initialOpenRef.current = false;
      nextOpen = true;
    }

    const { active: inputOpen } = dialog.input.current;
    if (nextOpen === inputOpen) return;

    if (nextOpen) dialog.open();
    else dialog.close();
  }, [controlledOpen, dialog]);

  useDestroy(dialog);

  const input = useSnapshot(dialog.input);
  const modality = useSnapshot(dialog.modality);
  const core = coreFactory();

  core.setProps({ open: controlledOpen, defaultOpen, closeOnEscape });
  core.setInput(input);
  core.setTitleId(titleId);
  core.setDescriptionId(descriptionId);
  core.setDocumentModal(modality.documentModal);

  return {
    core,
    dialog,
    state: core.getState(),
    stateAttrMap,
    popupId,
  };
}

function createDialogCore(): DialogCore {
  return new DialogCore();
}

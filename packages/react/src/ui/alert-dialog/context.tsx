'use client';

import type { AlertDialogCore, StateAttrMap } from '@videojs/core';
import type { AlertDialogApi } from '@videojs/core/dom';
import { createContext, useContext } from 'react';

/** Internal state shared between AlertDialog compound parts. */
export interface AlertDialogContextValue {
  /** Core state machine that derives rendered state and attributes. */
  core: AlertDialogCore;
  /** Imperative dialog handle returned by `createAlertDialog`. */
  dialog: AlertDialogApi;
  /** Snapshot of the current dialog state for rendered parts. */
  state: AlertDialogCore.State;
  /** Mapping of state fields to `data-*` attributes for styling. */
  stateAttrMap: StateAttrMap<AlertDialogCore.State>;
}

const AlertDialogContext = createContext<AlertDialogContextValue | null>(null);

export const AlertDialogContextProvider = AlertDialogContext.Provider;

/** Read the surrounding AlertDialog context. Throws when used outside an `AlertDialog.Root`. */
export function useAlertDialogContext(): AlertDialogContextValue {
  const ctx = useContext(AlertDialogContext);
  if (!ctx) throw new Error('AlertDialog compound components must be used within an AlertDialog.Root');
  return ctx;
}

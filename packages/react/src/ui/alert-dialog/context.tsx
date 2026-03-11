'use client';

import type { AlertDialogCore, StateAttrMap } from '@videojs/core';
import type { AlertDialogApi } from '@videojs/core/dom';
import { createContext, useContext } from 'react';

export interface AlertDialogContextValue {
  core: AlertDialogCore;
  dialog: AlertDialogApi;
  state: AlertDialogCore.State;
  stateAttrMap: StateAttrMap<AlertDialogCore.State>;
}

const AlertDialogContext = createContext<AlertDialogContextValue | null>(null);

export const AlertDialogContextProvider = AlertDialogContext.Provider;

export function useAlertDialogContext(): AlertDialogContextValue {
  const ctx = useContext(AlertDialogContext);
  if (!ctx) throw new Error('AlertDialog compound components must be used within an AlertDialog.Root');
  return ctx;
}

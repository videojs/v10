import type { AlertDialogCore, StateAttrMap } from '@videojs/core';
import type { AlertDialogApi } from '@videojs/core/dom';
import type { Provider } from 'react';

import { DialogContextProvider, type DialogContextValue, useDialogContextFor } from '../dialog/context';

export interface AlertDialogContextValue
  extends Omit<DialogContextValue, 'core' | 'dialog' | 'state' | 'stateAttrMap'> {
  core: AlertDialogCore;
  dialog: AlertDialogApi;
  state: AlertDialogCore.State;
  stateAttrMap: StateAttrMap<AlertDialogCore.State>;
}

export const AlertDialogContextProvider = DialogContextProvider as Provider<AlertDialogContextValue | null>;

export function useAlertDialogContext(): AlertDialogContextValue {
  return useDialogContextFor('AlertDialog') as AlertDialogContextValue;
}

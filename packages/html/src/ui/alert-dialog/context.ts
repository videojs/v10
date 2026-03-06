import type { AlertDialogState, StateAttrMap } from '@videojs/core';
import { createContext } from '@videojs/element/context';

export interface AlertDialogContextValue {
  state: AlertDialogState;
  stateAttrMap: StateAttrMap<AlertDialogState>;
  close: () => void;
}

const ALERT_DIALOG_CONTEXT_KEY = Symbol('@videojs/alert-dialog');

export const alertDialogContext = createContext<AlertDialogContextValue>(ALERT_DIALOG_CONTEXT_KEY);

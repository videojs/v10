import type { AlertDialogState, StateAttrMap } from '@videojs/core';
import { createContext } from '@videojs/element/context';

/** Value carried on `alertDialogContext` — current alert dialog state, attribute map, and close action. */
export interface AlertDialogContextValue {
  /** Alert dialog state propagated to descendants for `data-*` reflection. */
  state: AlertDialogState;
  /** Maps state keys to `data-*` attribute names. */
  stateAttrMap: StateAttrMap<AlertDialogState>;
  /** Dismisses the dialog. */
  close: () => void;
}

const ALERT_DIALOG_CONTEXT_KEY = Symbol('@videojs/alert-dialog');

/** Context that descendants of `<media-alert-dialog>` consume to react to dialog state and request close. */
export const alertDialogContext = createContext<AlertDialogContextValue>(ALERT_DIALOG_CONTEXT_KEY);

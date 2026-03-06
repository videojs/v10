import type { StateAttrMap } from '../types';
import type { AlertDialogState } from './alert-dialog-core';

export const AlertDialogDataAttrs = {
  /** Present when the dialog is open. */
  open: 'data-open',
  /** Present when the open transition is in progress. */
  transitionStarting: 'data-starting-style',
  /** Present when the close transition is in progress. */
  transitionEnding: 'data-ending-style',
} as const satisfies StateAttrMap<AlertDialogState>;

import type { StateAttrMap } from '../types';
import type { AlertDialogState } from './alert-dialog-core';

export const AlertDialogDataAttrs = {
  /** Present when the dialog is open. */
  open: 'data-open',
  /** Present during the open transition. */
  transitionStarting: 'data-starting-style',
  /** Present during the close transition. */
  transitionEnding: 'data-ending-style',
} as const satisfies StateAttrMap<AlertDialogState>;

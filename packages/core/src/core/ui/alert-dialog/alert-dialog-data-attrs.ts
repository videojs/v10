import { TransitionDataAttrs } from '../transition';
import type { StateAttrMap } from '../types';
import type { AlertDialogState } from './alert-dialog-core';

export const AlertDialogDataAttrs = {
  /** Present when the dialog is open. */
  open: 'data-open',
  ...TransitionDataAttrs,
} as const satisfies StateAttrMap<AlertDialogState>;

import { TransitionDataAttrs } from '../transition';
import type { StateAttrMap } from '../types';
import type { ErrorDialogState } from './error-dialog-core';

export const ErrorDialogDataAttrs = {
  /** Present when the error dialog is open. */
  open: 'data-open',
  ...TransitionDataAttrs,
} as const satisfies StateAttrMap<ErrorDialogState>;

import { DialogDataAttrs } from '../dialog/data';
import type { StateAttrMap } from '../types';
import type { AlertDialogState } from './core';

export const AlertDialogDataAttrs = {
  ...DialogDataAttrs,
} as const satisfies StateAttrMap<AlertDialogState>;

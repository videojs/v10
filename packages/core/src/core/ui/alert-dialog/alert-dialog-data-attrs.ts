import type { StateAttrMap } from '../types';

export const AlertDialogDataAttrs = {
  open: 'data-open',
} as const satisfies StateAttrMap<{ open: boolean }>;

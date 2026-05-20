import type { StateAttrMap } from '../types';
import type { PiPButtonState } from './pip-button-core';

/** Data attributes the picture-in-picture button reflects from {@link PiPButtonState}. */
export const PiPButtonDataAttrs = {
  /** Present when picture-in-picture mode is active. */
  pip: 'data-pip',
  /** Indicates picture-in-picture availability (`available` or `unsupported`). */
  availability: 'data-availability',
} as const satisfies StateAttrMap<PiPButtonState>;

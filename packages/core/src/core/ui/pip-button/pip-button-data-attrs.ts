import type { StateAttrMap } from '../types';
import type { PiPButtonState } from './pip-button-core';

export const PiPButtonDataAttrs = {
  /** Present when picture-in-picture mode is active. */
  pip: 'data-pip',
  /** Indicates picture-in-picture availability (`available` or `unsupported`). */
  availability: 'data-availability',
  /** Present when picture-in-picture is available. */
  available: 'data-available',
} as const satisfies StateAttrMap<PiPButtonState>;

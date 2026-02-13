import type { StateAttrMap } from '../types';
import type { PipButtonState } from './pip-button-core';

export const PipButtonDataAttrs = {
  /** Present when picture-in-picture mode is active. */
  pip: 'data-pip',
  /** Indicates picture-in-picture availability (`available` or `unsupported`). */
  availability: 'data-availability',
} as const satisfies StateAttrMap<PipButtonState>;

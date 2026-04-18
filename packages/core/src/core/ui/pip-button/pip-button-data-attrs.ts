import type { StateAttrMap } from '../types';
import type { PiPButtonState } from './pip-button-core';

export const PiPButtonDataAttrs = {
  /** Present when picture-in-picture mode is active. */
  pip: 'data-pip',
  /** Indicates picture-in-picture availability (`available` or `unsupported`). */
  availability: 'data-availability',
  /** Present when the button is non-interactive (explicitly disabled or feature not available). */
  disabled: 'data-disabled',
  /** Present when the feature is unsupported. */
  hidden: 'data-hidden',
} as const satisfies StateAttrMap<PiPButtonState>;

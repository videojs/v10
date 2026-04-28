import type { StateAttrMap } from '../types';
import type { PiPButtonState } from './pip-button-core';

export const PiPButtonDataAttrs = {
  /** Present when picture-in-picture mode is active. */
  pip: 'data-pip',
  /** Indicates picture-in-picture availability (`available`, `unavailable`, `unsupported`). */
  availability: 'data-availability',
  /** Present when the button is non-interactive (mirrors `aria-disabled`). */
  disabled: 'data-disabled',
  /** Present when the button is hidden because picture-in-picture is unsupported. */
  hidden: 'data-hidden',
} as const satisfies StateAttrMap<PiPButtonState>;

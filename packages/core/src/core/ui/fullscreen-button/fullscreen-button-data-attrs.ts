import type { StateAttrMap } from '../types';
import type { FullscreenButtonState } from './fullscreen-button-core';

export const FullscreenButtonDataAttrs = {
  /** Present when fullscreen mode is active. */
  fullscreen: 'data-fullscreen',
  /** Indicates fullscreen availability (`available` or `unsupported`). */
  availability: 'data-availability',
  /** Present when the button is non-interactive (explicitly disabled or feature not available). */
  disabled: 'data-disabled',
  /** Present when the feature is unsupported. */
  hidden: 'data-hidden',
} as const satisfies StateAttrMap<FullscreenButtonState>;

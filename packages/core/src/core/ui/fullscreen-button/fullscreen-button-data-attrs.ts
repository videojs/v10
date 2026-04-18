import type { StateAttrMap } from '../types';
import type { FullscreenButtonState } from './fullscreen-button-core';

export const FullscreenButtonDataAttrs = {
  /** Present when fullscreen mode is active. */
  fullscreen: 'data-fullscreen',
  /** Indicates fullscreen availability (`available` or `unsupported`). */
  availability: 'data-availability',
  /** Present when fullscreen is available. */
  available: 'data-available',
} as const satisfies StateAttrMap<FullscreenButtonState>;

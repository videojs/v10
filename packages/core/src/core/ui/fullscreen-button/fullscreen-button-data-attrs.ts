import type { StateAttrMap } from '../types';
import type { FullscreenButtonState } from './fullscreen-button-core';

/** Data attributes the fullscreen button reflects from {@link FullscreenButtonState}. */
export const FullscreenButtonDataAttrs = {
  /** Present when fullscreen mode is active. */
  fullscreen: 'data-fullscreen',
  /** Indicates fullscreen availability (`available` or `unsupported`). */
  availability: 'data-availability',
} as const satisfies StateAttrMap<FullscreenButtonState>;

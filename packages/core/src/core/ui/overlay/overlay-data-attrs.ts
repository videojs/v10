import type { StateAttrMap } from '../types';
import type { OverlayState } from './overlay-core';

export const OverlayDataAttrs = {
  /** Present when the overlay should be visible. */
  visible: 'data-visible',
  /** Present when controls visibility is showing the overlay. */
  controlsVisible: 'data-controls-visible',
  /** Present when error visibility is showing the overlay. */
  errorVisible: 'data-error-visible',
} as const satisfies StateAttrMap<OverlayState>;

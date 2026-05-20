import type { StateAttrMap } from '../types';
import type { ControlsState } from './controls-core';

/** Data attributes the controls layer reflects from {@link ControlsState}. */
export const ControlsDataAttrs = {
  /** Present when controls are visible. */
  visible: 'data-visible',
  /** Present when the user has recently interacted. */
  userActive: 'data-user-active',
} as const satisfies StateAttrMap<ControlsState>;

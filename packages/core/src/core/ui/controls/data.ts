import type { StateAttrMap } from '../types';
import type { ControlsState } from './core';

export const ControlsDataAttrs = {
  /** Present when controls are visible. */
  visible: 'data-visible',
  /** Present when the user has recently interacted. */
  userActive: 'data-user-active',
} as const satisfies StateAttrMap<ControlsState>;

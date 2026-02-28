import type { StateAttrMap } from '../types';
import type { PopoverState } from './popover-core';

export const PopoverDataAttrs = {
  /** Present when the popover is open. */
  open: 'data-open',
  /** Indicates which side the popover is positioned relative to the trigger. */
  side: 'data-side',
  /** Indicates how the popover is aligned relative to the specified side. */
  align: 'data-align',
} as const satisfies StateAttrMap<PopoverState>;

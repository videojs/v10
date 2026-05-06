import { TransitionDataAttrs } from '../transition';
import type { StateAttrMap } from '../types';
import type { TooltipState } from './tooltip-core';

export const TooltipDataAttrs = {
  /** Present when the tooltip is open. */
  open: 'data-open',
  /** Indicates which side the tooltip is positioned relative to the trigger. */
  side: 'data-side',
  /** Indicates how the tooltip is aligned relative to the specified side. */
  align: 'data-align',
  ...TransitionDataAttrs,
} as const satisfies StateAttrMap<TooltipState>;

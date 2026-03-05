import type { StateAttrMap } from '../types';
import type { TooltipState } from './tooltip-core';

export const TooltipDataAttrs = {
  /** Present when the tooltip is open. */
  open: 'data-open',
  /** Indicates which side the tooltip is positioned relative to the trigger. */
  side: 'data-side',
  /** Indicates how the tooltip is aligned relative to the specified side. */
  align: 'data-align',
  /** Present when the open transition is in progress. */
  transitionStarting: 'data-starting-style',
  /** Present when the close transition is in progress. */
  transitionEnding: 'data-ending-style',
} as const satisfies StateAttrMap<TooltipState>;

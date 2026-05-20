import type { StateAttrMap } from '../types';
import type { StatusIndicatorState } from './status-indicator-core';

/** Data attributes the status indicator reflects from {@link StatusIndicatorState}. */
export const StatusIndicatorDataAttrs = {
  /** Present when the indicator is open. */
  open: 'data-open',
  /** Current status key (drives icon selection). */
  status: 'data-status',
  /** Present at the start of an enter transition. */
  transitionStarting: 'data-starting-style',
  /** Present at the start of an exit transition. */
  transitionEnding: 'data-ending-style',
} as const satisfies StateAttrMap<StatusIndicatorState>;

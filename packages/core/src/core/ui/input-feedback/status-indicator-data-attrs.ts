import type { StateAttrMap } from '../types';
import type { StatusIndicatorState } from './status-indicator-core';

export const StatusIndicatorDataAttrs = {
  open: 'data-open',
  status: 'data-status',
  transitionStarting: 'data-starting-style',
  transitionEnding: 'data-ending-style',
} as const satisfies StateAttrMap<StatusIndicatorState>;

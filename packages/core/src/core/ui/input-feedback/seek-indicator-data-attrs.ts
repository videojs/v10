import type { StateAttrMap } from '../types';
import type { SeekIndicatorState } from './seek-indicator-core';

export const SeekIndicatorDataAttrs = {
  open: 'data-open',
  direction: 'data-direction',
  transitionStarting: 'data-starting-style',
  transitionEnding: 'data-ending-style',
} as const satisfies StateAttrMap<SeekIndicatorState>;

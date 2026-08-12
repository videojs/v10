import type { StateAttrMap } from '../types';
import type { SeekIndicatorState } from './core';

export const SeekIndicatorDataAttrs = {
  open: 'data-open',
  direction: 'data-direction',
  transitionStarting: 'data-starting-style',
  transitionEnding: 'data-ending-style',
} as const satisfies StateAttrMap<SeekIndicatorState>;

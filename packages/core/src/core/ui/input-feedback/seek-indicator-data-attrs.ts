import type { StateAttrMap } from '../types';
import type { SeekIndicatorState } from './seek-indicator-core';

/** Data attributes the seek indicator reflects from {@link SeekIndicatorState}. */
export const SeekIndicatorDataAttrs = {
  /** Present when the indicator is open. */
  open: 'data-open',
  /** Seek direction (`forward` or `backward`). */
  direction: 'data-direction',
  /** Present at the start of an enter transition. */
  transitionStarting: 'data-starting-style',
  /** Present at the start of an exit transition. */
  transitionEnding: 'data-ending-style',
} as const satisfies StateAttrMap<SeekIndicatorState>;

import type { StateAttrMap } from '../types';
import type { BufferingIndicatorState } from './buffering-indicator-core';

/** Data attributes the buffering indicator reflects from {@link BufferingIndicatorState}. */
export const BufferingIndicatorDataAttrs = {
  /** Present when the buffering indicator is visible (after delay). */
  visible: 'data-visible',
} as const satisfies StateAttrMap<BufferingIndicatorState>;

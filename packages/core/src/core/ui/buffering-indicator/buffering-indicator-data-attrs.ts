import type { StateAttrMap } from '../types';
import type { BufferingIndicatorState } from './buffering-indicator-core';

export const BufferingIndicatorDataAttrs = {
  /** Present when the buffering indicator is visible (after delay). */
  visible: 'data-visible',
} as const satisfies StateAttrMap<BufferingIndicatorState>;

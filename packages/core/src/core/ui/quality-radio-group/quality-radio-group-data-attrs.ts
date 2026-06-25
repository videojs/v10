import type { StateAttrMap } from '../types';
import type { QualityRadioGroupState } from './quality-radio-group-core';

export const QualityRadioGroupDataAttrs = {
  /** Current quality value. */
  value: 'data-quality',
  /** Present when quality selection is disabled. */
  disabled: 'data-disabled',
  /** Indicates quality availability (`available` or `unavailable`). */
  availability: 'data-availability',
} as const satisfies StateAttrMap<QualityRadioGroupState>;

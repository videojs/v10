import type { StateAttrMap } from '../types';
import type { CaptionsRadioGroupState } from './captions-radio-group-core';

export const CaptionsRadioGroupDataAttrs = {
  /** Present when captions are enabled. */
  subtitlesShowing: 'data-active',
  /** Present when track selection is disabled. */
  disabled: 'data-disabled',
} as const satisfies StateAttrMap<CaptionsRadioGroupState>;

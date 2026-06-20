import { defineComponent } from '../manifest';
import type { CaptionsRadioGroupProps } from './captions-radio-group-core';
import { CaptionsRadioGroupDataAttrs } from './captions-radio-group-data-attrs';

export default defineComponent<CaptionsRadioGroupProps>()({
  name: 'CaptionsRadioGroup',
  dataAttrs: CaptionsRadioGroupDataAttrs,
});

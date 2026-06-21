import { defineComponent } from '../manifest';
import { CaptionsRadioGroupDataAttrs } from './captions-radio-group-data-attrs';
import type { CaptionsRadioGroupProps } from './props';

export default defineComponent<CaptionsRadioGroupProps>()({
  name: 'CaptionsRadioGroup',
  dataAttrs: CaptionsRadioGroupDataAttrs,
});

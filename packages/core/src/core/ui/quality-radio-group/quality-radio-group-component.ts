import { defineComponent } from '@videojs/compiler';
import type { QualityRadioGroupProps } from './quality-radio-group-core';
import { QualityRadioGroupDataAttrs } from './quality-radio-group-data-attrs';

export default defineComponent<QualityRadioGroupProps>()({
  name: 'QualityRadioGroup',
  dataAttrs: QualityRadioGroupDataAttrs,
});

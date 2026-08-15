import { defineComponent } from '@videojs/jsx';
import type { QualityRadioGroupProps } from './quality-radio-group-core';
import { QualityRadioGroupDataAttrs } from './quality-radio-group-data-attrs';

export default defineComponent<QualityRadioGroupProps>({
  name: 'QualityRadioGroup',
  dataAttrs: QualityRadioGroupDataAttrs,
});

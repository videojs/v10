import { defineComponent } from '../manifest';
import type { QualityRadioGroupProps } from './props';
import { QualityRadioGroupDataAttrs } from './quality-radio-group-data-attrs';

export default defineComponent<QualityRadioGroupProps>({
  name: 'QualityRadioGroup',
  dataAttrs: QualityRadioGroupDataAttrs,
});

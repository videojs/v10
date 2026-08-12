import { defineComponent } from 'vjsc/components';

import type { QualityRadioGroupProps } from './core';
import { QualityRadioGroupDataAttrs } from './data';

export default defineComponent<QualityRadioGroupProps>({
  name: 'QualityRadioGroup',
  dataAttrs: QualityRadioGroupDataAttrs,
});

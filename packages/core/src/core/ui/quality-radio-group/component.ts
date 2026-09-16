import { defineComponent } from 'vjsc/components';

import type { QualityRadioGroupProps } from './core';
import { QualityRadioGroupDataAttrs } from './data';

export default defineComponent({
  name: 'QualityRadioGroup',
  parts: {
    Root: defineComponent<QualityRadioGroupProps>(),
    Value: defineComponent(),
    Options: defineComponent(),
  },
  dataAttrs: QualityRadioGroupDataAttrs,
});

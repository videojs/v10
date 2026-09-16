import { defineComponent } from 'vjsc/components';

import type { PlaybackRateRadioGroupProps } from './core';
import { PlaybackRateRadioGroupDataAttrs } from './data';

export default defineComponent({
  name: 'PlaybackRateRadioGroup',
  parts: {
    Root: defineComponent<PlaybackRateRadioGroupProps>(),
    Value: defineComponent(),
    Options: defineComponent(),
  },
  dataAttrs: PlaybackRateRadioGroupDataAttrs,
});

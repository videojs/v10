import { defineComponent } from 'vjsc/components';

import type { AudioTrackRadioGroupProps } from './core';
import { AudioTrackRadioGroupDataAttrs } from './data';

export default defineComponent({
  name: 'AudioTrackRadioGroup',
  parts: {
    Root: defineComponent<AudioTrackRadioGroupProps>(),
    Value: defineComponent(),
    Options: defineComponent(),
  },
  dataAttrs: AudioTrackRadioGroupDataAttrs,
});

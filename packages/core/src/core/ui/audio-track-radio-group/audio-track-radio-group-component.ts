import { defineComponent } from 'vjsc/components';

import type { AudioTrackRadioGroupProps } from './audio-track-radio-group-core';
import { AudioTrackRadioGroupDataAttrs } from './audio-track-radio-group-data-attrs';

export default defineComponent<AudioTrackRadioGroupProps>({
  name: 'AudioTrackRadioGroup',
  dataAttrs: AudioTrackRadioGroupDataAttrs,
});

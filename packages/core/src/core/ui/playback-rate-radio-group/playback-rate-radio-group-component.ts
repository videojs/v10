import { defineComponent } from '@videojs/compiler';
import type { PlaybackRateRadioGroupProps } from './playback-rate-radio-group-core';
import { PlaybackRateRadioGroupDataAttrs } from './playback-rate-radio-group-data-attrs';

export default defineComponent<PlaybackRateRadioGroupProps>()({
  name: 'PlaybackRateRadioGroup',
  dataAttrs: PlaybackRateRadioGroupDataAttrs,
});

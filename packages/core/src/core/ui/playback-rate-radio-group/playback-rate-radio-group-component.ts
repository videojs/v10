import { defineComponent } from '../manifest';
import { PlaybackRateRadioGroupDataAttrs } from './playback-rate-radio-group-data-attrs';
import type { PlaybackRateRadioGroupProps } from './props';

export default defineComponent<PlaybackRateRadioGroupProps>()({
  name: 'PlaybackRateRadioGroup',
  dataAttrs: PlaybackRateRadioGroupDataAttrs,
});

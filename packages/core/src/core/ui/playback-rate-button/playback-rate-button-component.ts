import { defineComponent } from '../manifest';
import { PlaybackRateButtonDataAttrs } from './playback-rate-button-data-attrs';
import type { PlaybackRateButtonProps } from './props';

export default defineComponent<PlaybackRateButtonProps>()({
  name: 'PlaybackRateButton',
  dataAttrs: PlaybackRateButtonDataAttrs,
});

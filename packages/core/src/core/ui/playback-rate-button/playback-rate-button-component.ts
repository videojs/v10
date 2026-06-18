import { defineComponent } from '@videojs/compiler';
import type { PlaybackRateButtonProps } from './playback-rate-button-core';
import { PlaybackRateButtonDataAttrs } from './playback-rate-button-data-attrs';

export default defineComponent<PlaybackRateButtonProps>()({
  name: 'PlaybackRateButton',
  dataAttrs: PlaybackRateButtonDataAttrs,
});

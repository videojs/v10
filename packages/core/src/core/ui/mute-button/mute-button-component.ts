import { defineComponent } from '@videojs/compiler';
import type { MuteButtonProps } from './mute-button-core';
import { MuteButtonDataAttrs } from './mute-button-data-attrs';

export default defineComponent<MuteButtonProps>()({
  name: 'MuteButton',
  dataAttrs: MuteButtonDataAttrs,
});

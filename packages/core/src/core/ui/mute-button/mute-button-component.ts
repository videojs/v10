import { defineComponent } from '../manifest';
import { MuteButtonDataAttrs } from './mute-button-data-attrs';
import type { MuteButtonProps } from './props';

export default defineComponent<MuteButtonProps>()({
  name: 'MuteButton',
  dataAttrs: MuteButtonDataAttrs,
});

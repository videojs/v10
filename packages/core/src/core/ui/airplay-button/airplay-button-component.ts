import { defineComponent } from '../manifest';
import { AirPlayButtonDataAttrs } from './airplay-button-data-attrs';
import type { AirPlayButtonProps } from './props';

export default defineComponent<AirPlayButtonProps>()({
  name: 'AirPlayButton',
  dataAttrs: AirPlayButtonDataAttrs,
});

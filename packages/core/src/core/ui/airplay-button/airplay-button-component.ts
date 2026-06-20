import { defineComponent } from '../manifest';
import type { AirPlayButtonProps } from './airplay-button-core';
import { AirPlayButtonDataAttrs } from './airplay-button-data-attrs';

export default defineComponent<AirPlayButtonProps>()({
  name: 'AirPlayButton',
  dataAttrs: AirPlayButtonDataAttrs,
});

import { defineComponent } from '@videojs/compiler';
import type { PlayButtonProps } from './play-button-core';
import { PlayButtonDataAttrs } from './play-button-data-attrs';

export default defineComponent<PlayButtonProps>()({
  name: 'PlayButton',
  dataAttrs: PlayButtonDataAttrs,
});

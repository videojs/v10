import { defineComponent } from '@videojs/compiler';
import type { SeekButtonProps } from './seek-button-core';
import { SeekButtonDataAttrs } from './seek-button-data-attrs';

export default defineComponent<SeekButtonProps>()({
  name: 'SeekButton',
  dataAttrs: SeekButtonDataAttrs,
});

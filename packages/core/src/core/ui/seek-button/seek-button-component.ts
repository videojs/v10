import { defineComponent } from '@videojs/jsx';
import type { SeekButtonProps } from './seek-button-core';
import { SeekButtonDataAttrs } from './seek-button-data-attrs';

export default defineComponent<SeekButtonProps>({
  name: 'SeekButton',
  dataAttrs: SeekButtonDataAttrs,
});

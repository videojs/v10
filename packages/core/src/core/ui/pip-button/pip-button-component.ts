import { defineComponent } from '@videojs/compiler';
import type { PiPButtonProps } from './pip-button-core';
import { PiPButtonDataAttrs } from './pip-button-data-attrs';

export default defineComponent<PiPButtonProps>()({
  name: 'PiPButton',
  dataAttrs: PiPButtonDataAttrs,
});

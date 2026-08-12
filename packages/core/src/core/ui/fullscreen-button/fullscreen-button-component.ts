import { defineComponent } from '@videojs/jsx';
import type { FullscreenButtonProps } from './core';
import { FullscreenButtonDataAttrs } from './data';

export default defineComponent<FullscreenButtonProps>({
  name: 'FullscreenButton',
  dataAttrs: FullscreenButtonDataAttrs,
});

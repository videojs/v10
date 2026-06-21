import { defineComponent } from '../manifest';
import { FullscreenButtonDataAttrs } from './fullscreen-button-data-attrs';
import type { FullscreenButtonProps } from './props';

export default defineComponent<FullscreenButtonProps>()({
  name: 'FullscreenButton',
  dataAttrs: FullscreenButtonDataAttrs,
});

import { defineComponent } from '@videojs/compiler';
import type { LiveButtonProps } from './live-button-core';
import { LiveButtonDataAttrs } from './live-button-data-attrs';

export default defineComponent<LiveButtonProps>()({
  name: 'LiveButton',
  dataAttrs: LiveButtonDataAttrs,
});

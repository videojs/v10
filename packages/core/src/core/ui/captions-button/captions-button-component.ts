import { defineComponent } from '@videojs/compiler';
import type { CaptionsButtonProps } from './captions-button-core';
import { CaptionsButtonDataAttrs } from './captions-button-data-attrs';

export default defineComponent<CaptionsButtonProps>()({
  name: 'CaptionsButton',
  dataAttrs: CaptionsButtonDataAttrs,
});

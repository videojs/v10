import { defineComponent } from '../manifest';
import { CaptionsButtonDataAttrs } from './captions-button-data-attrs';
import type { CaptionsButtonProps } from './props';

export default defineComponent<CaptionsButtonProps>()({
  name: 'CaptionsButton',
  dataAttrs: CaptionsButtonDataAttrs,
});

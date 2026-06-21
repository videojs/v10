import { defineComponent } from '../manifest';
import { LiveButtonDataAttrs } from './live-button-data-attrs';
import type { LiveButtonProps } from './props';

export default defineComponent<LiveButtonProps>()({
  name: 'LiveButton',
  dataAttrs: LiveButtonDataAttrs,
});

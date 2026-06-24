import { defineComponent } from '../manifest';
import { PiPButtonDataAttrs } from './pip-button-data-attrs';
import type { PiPButtonProps } from './props';

export default defineComponent<PiPButtonProps>({
  name: 'PiPButton',
  dataAttrs: PiPButtonDataAttrs,
});

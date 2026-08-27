import { defineComponent } from 'vjsc/components';

import type { LiveButtonProps } from './core';
import { LiveButtonDataAttrs } from './data';

export default defineComponent<LiveButtonProps>({
  name: 'LiveButton',
  dataAttrs: LiveButtonDataAttrs,
});

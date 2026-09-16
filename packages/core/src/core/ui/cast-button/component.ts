import { defineComponent } from 'vjsc/components';

import type { CastButtonProps } from './core';
import { CastButtonDataAttrs } from './data';

export default defineComponent<CastButtonProps>({
  name: 'CastButton',
  dataAttrs: CastButtonDataAttrs,
});

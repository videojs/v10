import { defineComponent } from 'vjsc/components';

import type { FullscreenButtonProps } from './fullscreen-button-core';
import { FullscreenButtonDataAttrs } from './fullscreen-button-data-attrs';

export default defineComponent<FullscreenButtonProps>({
  name: 'FullscreenButton',
  dataAttrs: FullscreenButtonDataAttrs,
});

import { defineComponent } from '@videojs/compiler';
import type { TooltipProps } from './tooltip-core';
import { TooltipDataAttrs } from './tooltip-data-attrs';

export default defineComponent<TooltipProps>()({
  name: 'Tooltip',
  parts: ['Provider', 'Root', 'Trigger', 'Popup', 'Arrow', 'Label', 'Shortcut'] as const,
  dataAttrs: TooltipDataAttrs,
});

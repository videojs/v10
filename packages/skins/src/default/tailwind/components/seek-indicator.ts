import { cn } from '@videojs/utils/style';

import { centeredIndicatorRoot } from './input-indicator';

export const seekIndicator = {
  root: cn(
    centeredIndicatorRoot,
    'gap-1',
    '@2xl/media-root:p-6',
    'data-[direction=backward]:col-start-1 data-[direction=backward]:justify-self-start',
    'data-[direction=forward]:col-start-3 data-[direction=forward]:justify-self-end'
  ),
  icon: cn(
    'hidden size-[calc(var(--media-icon-size)*1.5)]',
    'group-data-direction/input-indicator:block',
    'group-data-[direction=backward]/input-indicator:[scale:-1_1]',
    'motion-safe:transition-[translate,opacity] motion-safe:duration-200 motion-safe:ease-in-out',
    'motion-safe:group-data-starting-style/input-indicator:opacity-0',
    'motion-safe:group-data-ending-style/input-indicator:opacity-0',
    'motion-safe:group-data-[direction=forward]/input-indicator:group-data-starting-style/input-indicator:[translate:-60%_0]',
    'motion-safe:group-data-[direction=backward]/input-indicator:group-data-starting-style/input-indicator:[translate:60%_0]'
  ),
  value: 'tabular-nums',
};

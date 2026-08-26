import { cn } from '@videojs/utils/style';

import { centeredIndicatorRoot, topIndicatorContent, topIndicatorIcon, topIndicatorRoot } from './input-indicator';

export const statusIndicator = {
  root: cn(topIndicatorRoot, 'data-open:duration-100'),
  content: topIndicatorContent,
  value: 'ml-auto',
  icon: {
    base: topIndicatorIcon,
    captionsOn: 'group-data-[status=captions-on]/input-indicator:block',
    captionsOff: 'group-data-[status=captions-off]/input-indicator:block',
    fullscreenEnter: 'group-data-[status=fullscreen]/input-indicator:block',
    fullscreenExit: 'group-data-[status=exit-fullscreen]/input-indicator:block',
    pipEnter: 'group-data-[status=pip]/input-indicator:block',
    pipExit: 'group-data-[status=exit-pip]/input-indicator:block',
  },
  playback: {
    root: cn(
      centeredIndicatorRoot,
      '[transition-property:opacity,scale]',
      'duration-200 ease-out',
      'motion-reduce:transition-opacity',
      'motion-reduce:duration-50',
      'data-starting-style:opacity-0',
      'data-ending-style:opacity-0',
      'data-starting-style:scale-[0.85]',
      'data-ending-style:scale-[0.85]',
      'data-ending-style:duration-100',
      'data-ending-style:ease-in',
      'motion-reduce:data-starting-style:scale-100',
      'motion-reduce:data-ending-style:scale-100'
    ),
    icon: {
      base: cn(
        'col-start-1 row-start-1 size-[calc(var(--media-icon-size)*2)]',
        'opacity-0 scale-0',
        '[transition-property:opacity,scale] duration-150 ease-out',
        'motion-reduce:scale-100 motion-reduce:transition-opacity motion-reduce:duration-50'
      ),
      pause:
        'group-data-[status=pause]/input-indicator:opacity-100 group-data-[status=pause]/input-indicator:scale-100',
      play: 'group-data-[status=play]/input-indicator:opacity-100 group-data-[status=play]/input-indicator:scale-100',
    },
  },
};

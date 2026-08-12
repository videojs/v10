import { cn } from '@videojs/utils/style';
import { centeredIndicatorRoot, topIndicatorContent, topIndicatorRoot } from './input-indicator';

export const statusIndicator = {
  root: cn(topIndicatorRoot, 'data-open:duration-100'),
  content: topIndicatorContent,
  value: 'ml-auto',
  icon: {
    base: 'hidden shrink-0',
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
      'bg-black/35 rounded-full backdrop-blur-sm',
      '[transition-property:opacity,scale]',
      'duration-200 ease-out',
      'motion-reduce:transition-opacity',
      'motion-reduce:duration-50',
      'data-starting-style:opacity-0',
      'data-ending-style:opacity-0',
      'data-starting-style:scale-[0.85]',
      'data-ending-style:scale-[0.85]',
      'data-ending-style:duration-100',
      'data-ending-style:ease-in'
    ),
    icon: {
      base: 'hidden size-[calc(var(--media-icon-size)*1.5)]',
      pause: 'group-data-[status=pause]/input-indicator:block',
      play: cn(
        'group-data-[status=play]/input-indicator:block',
        'group-data-[status=play]/input-indicator:translate-x-px'
      ),
    },
  },
};

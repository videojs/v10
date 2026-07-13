import { cn } from '@videojs/utils/style';

export const time = {
  group: 'flex items-center gap-1',
  current: cn('hidden tabular-nums', '@2xl/media-container:inline'),
  separator: cn('hidden', '@2xl/media-container:inline @2xl/media-container:text-current/60'),
  duration: cn('tabular-nums', '@2xl/media-container:text-current/60'),
  controls: cn('@container flex flex-row-reverse items-center flex-1 gap-3', '@2xl/media-container:flex-row'),
};

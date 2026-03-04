import { cn } from '@videojs/utils/style';

export const time = {
  group: 'flex items-center gap-1',
  current: cn('hidden tabular-nums', '@md/media-controls:inline'),
  separator: cn('hidden', '@md/media-controls:inline @md/media-controls:text-white/50'),
  duration: cn('tabular-nums', '@md/media-controls:text-current/60'),
  controls: cn('flex flex-row-reverse items-center flex-1 gap-3', '@md/media-controls:flex-row'),
};

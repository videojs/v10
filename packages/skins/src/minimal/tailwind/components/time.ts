import { cn } from '@videojs/utils/style';

export const time = {
  group: 'flex items-center gap-1',
  current: cn(
    'hidden tabular-nums cursor-pointer rounded-sm outline-2 outline-transparent -outline-offset-2',
    'transition-[outline-color,outline-offset] duration-100 ease-out',
    'supports-[corner-shape:squircle]:rounded-4',
    'supports-[corner-shape:squircle]:[corner-shape:squircle]',
    'focus-visible:outline-current focus-visible:outline-offset-2',
    '@2xl/media-root:inline'
  ),
  separator: cn('hidden', '@2xl/media-root:inline @2xl/media-root:text-current/60'),
  duration: cn('tabular-nums', '@2xl/media-root:text-current/60'),
  controls: cn('@container flex flex-row-reverse items-center flex-1 gap-3', '@2xl/media-root:flex-row'),
};

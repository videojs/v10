import { cn } from '@videojs/utils/style';

export const preview = {
  root: 'group/preview pointer-events-none',
  thumbnailWrapper: 'relative rounded-lg bg-black/90',
  thumbnail: cn('block rounded-[inherit] transition-opacity duration-150 ease-out', 'data-loading:opacity-0'),
  time: 'mt-2 block text-center tabular-nums',
  spinner: cn(
    'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0',
    'transition-opacity duration-150 ease-out',
    'group-has-[[role=img][data-loading]]/preview:opacity-100'
  ),
};

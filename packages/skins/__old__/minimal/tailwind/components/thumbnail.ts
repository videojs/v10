import { cn } from '@videojs/utils/style';

export const thumbnail = {
  root: 'group/thumbnail peer/thumbnail pointer-events-none',
  imageWrapper: 'relative rounded-lg bg-black/90',
  image: cn('block rounded-[inherit] transition-opacity duration-150 ease-out', 'data-loading:opacity-0'),
  time: 'mt-2 block text-center tabular-nums',
  spinner: cn(
    'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0',
    'transition-opacity duration-150 ease-out',
    'group-not-has-[[role=img][data-loading]]/thumbnail:[--media-spinner-animation:none] group-has-[[role=img][data-loading]]/thumbnail:opacity-100'
  ),
};

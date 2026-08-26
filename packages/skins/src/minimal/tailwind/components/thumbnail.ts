import { cn } from '@videojs/utils/style';

export const thumbnail = {
  root: cn(
    'group/thumbnail pointer-events-none bg-black/90 rounded-[--spacing(2)]',
    'after:absolute after:inset-0 after:rounded-[inherit]',
    'after:ring-1 after:ring-black/5 after:shadow-sm after:shadow-black/20',
    'has-data-loading:w-(--media-thumbnail-max-width) has-data-loading:max-w-full',
    'has-data-loading:aspect-video has-data-loading:overflow-hidden'
  ),
  image: cn(
    'relative block max-w-(--media-thumbnail-max-width) max-h-(--media-thumbnail-max-height) overflow-clip rounded-[inherit]',
    'transition-opacity duration-150 ease-out data-loading:opacity-0'
  ),
  spinner: cn(
    'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0',
    'transition-opacity duration-150 ease-out',
    'group-not-has-[[role=img][data-loading]]/thumbnail:[--media-spinner-animation:none] motion-reduce:[--media-spinner-animation:none] group-has-[[role=img][data-loading]]/thumbnail:opacity-100'
  ),
};

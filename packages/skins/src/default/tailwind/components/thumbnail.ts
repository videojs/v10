import { cn } from '@videojs/utils/style';

export const thumbnail = {
  root: cn(
    'group/thumbnail pointer-events-none bg-black/90 rounded-[--spacing(3)]',
    'has-[[data-loading]]:w-(--thumbnail-max-width) has-[[data-loading]]:max-w-full',
    'has-[[data-loading]]:aspect-video has-[[data-loading]]:overflow-hidden'
  ),
  image: cn(
    'relative block max-w-(--thumbnail-max-width) max-h-(--max-height) overflow-clip rounded-[inherit]',
    'transition-opacity duration-150 ease-out',
    'after:absolute after:inset-0 after:rounded-[inherit]',
    'after:bg-linear-to-t after:from-black/50 after:via-black/10 after:to-black/0',
    'data-loading:opacity-0'
  ),
  spinner: cn(
    'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0',
    'transition-opacity duration-150 ease-out',
    'group-not-has-[[role=img][data-loading]]/thumbnail:[--media-spinner-animation:none] group-has-[[role=img][data-loading]]/thumbnail:opacity-100'
  ),
};

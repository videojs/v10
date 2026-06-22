import { cn } from '@videojs/utils/style';

export const poster = cn(
  'absolute inset-0 w-full h-full pointer-events-none',
  // Fade in/out with the `data-visible` attribute
  'transition-opacity duration-250',
  'not-data-visible:opacity-0',
  'rounded-[inherit] [object-fit:var(--media-object-fit,contain)] [object-position:var(--media-object-position,center)]'
);

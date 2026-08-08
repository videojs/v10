import { cn } from '@videojs/utils/style';

/**
 * The component sets `background-image` and nothing else, so one class string
 * covers both platforms. No `isShadowDOM` branch: there is no inner element to
 * reach past a shadow boundary.
 */
export const placeholder = cn(
  'absolute inset-0 pointer-events-none',
  'bg-no-repeat',
  '[background-position:var(--media-object-position,center)]',
  '[background-size:var(--media-object-fit,contain)]',
  '[filter:blur(var(--media-placeholder-blur,20px))]',
  // Fade out with the `data-visible` attribute, like the poster it sits behind.
  'transition-opacity duration-250',
  'not-data-visible:opacity-0',
  '[&:fullscreen]:bg-contain'
);

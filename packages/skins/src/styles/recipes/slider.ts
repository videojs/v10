import { themeRecipe } from './theme';

/** Animate slider preview content consistently across values and thumbnails. */
export const sliderPreviewContent = [
  'absolute max-w-(--media-slider-preview-max-width) -translate-x-1/2 translate-y-2 scale-80 opacity-0',
  'origin-bottom blur-sm',
  'motion-safe:transition-[filter,opacity,scale] motion-safe:duration-150 motion-safe:ease-out',
  'group-data-pointing/preview:scale-100 group-data-pointing/preview:opacity-100 group-data-pointing/preview:filter-none',
  'group-has-focus-visible/slider:scale-100 group-has-focus-visible/slider:opacity-100 group-has-focus-visible/slider:filter-none',
] as const;

/** Apply the shared focus and elevation treatment to slider thumbs. */
export const sliderThumbTheme = themeRecipe(
  [
    'outline-4 -outline-offset-4 outline-transparent',
    'shadow-[0_0_0_1px_rgb(0_0_0/0.1),0_1px_3px_0_rgb(0_0_0/0.35),0_1px_2px_-1px_rgb(0_0_0/0.35)]',
    'hover:outline-current/15 hover:outline-offset-0 focus-visible:outline-current/15 focus-visible:outline-offset-0',
    'after:pointer-events-none after:absolute after:-inset-1 after:scale-50 after:rounded-[inherit] after:opacity-0',
    'after:shadow-[0_0_0_2px_currentColor] motion-safe:after:transition-[opacity,scale] motion-safe:after:duration-150 motion-safe:after:ease-out',
    'focus-visible:after:scale-100 focus-visible:after:opacity-100',
  ],
  [
    'outline-2 -outline-offset-2 outline-transparent',
    'shadow-[0_0_0_1px_rgb(0_0_0/0.15),0_1px_3px_0_rgb(0_0_0/0.15),0_1px_2px_-1px_rgb(0_0_0/0.15)]',
    'focus-visible:outline-white focus-visible:outline-offset-2',
  ]
);

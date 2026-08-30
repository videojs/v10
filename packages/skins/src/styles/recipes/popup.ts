/** Position a popup from the side reported by the positioning primitive. */
export const popupPosition = [
  'm-0 overflow-visible border-0 text-inherit',
  'data-starting-style:opacity-0 data-starting-style:blur-xs',
  '[&:is([data-starting-style],[data-ending-style])]:[scale:.95]',
  'data-starting-style:[transform:translate(var(--media-popup-translate-x-distance,0),var(--media-popup-translate-y-distance,0))]',
  'data-ending-style:opacity-0 data-ending-style:blur-xs data-ending-style:transform-none',
  'motion-reduce:[&:is([data-starting-style],[data-ending-style])]:[scale:1]!',
  'motion-reduce:data-starting-style:transform-none! motion-reduce:data-ending-style:transform-none!',
  'motion-reduce:data-starting-style:filter-none! motion-reduce:data-ending-style:filter-none!',
  'data-[side=top]:origin-bottom data-[side=bottom]:origin-top data-[side=left]:origin-right data-[side=right]:origin-left',
  'data-[side=top]:[--media-popup-translate-y-distance:var(--media-popup-translate-distance)]',
  'data-[side=bottom]:[--media-popup-translate-y-distance:calc(var(--media-popup-translate-distance)*-1)]',
  'data-[side=left]:[--media-popup-translate-x-distance:var(--media-popup-translate-distance)]',
  'data-[side=right]:[--media-popup-translate-x-distance:calc(var(--media-popup-translate-distance)*-1)]',
  'before:pointer-events-auto before:absolute',
  'data-[side=top]:before:inset-x-0 data-[side=top]:before:top-full',
  'data-[side=bottom]:before:inset-x-0 data-[side=bottom]:before:bottom-full',
  'data-[side=left]:before:inset-y-0 data-[side=left]:before:left-full',
  'data-[side=right]:before:inset-y-0 data-[side=right]:before:right-full',
] as const;

/** Animate popup presence while reducing motion to opacity-only timing. */
export const popupTransition = [
  'transition-[opacity,filter,transform,scale] duration-100 ease-out motion-reduce:duration-0!',
  'data-ending-style:duration-50 motion-reduce:data-ending-style:duration-0!',
] as const;

/** Keep pointer travel between a popover and its trigger interactive. */
export const popoverSafeArea = [
  'data-[side=top]:before:h-(--media-popover-side-offset) data-[side=bottom]:before:h-(--media-popover-side-offset)',
  'data-[side=left]:before:w-(--media-popover-side-offset) data-[side=right]:before:w-(--media-popover-side-offset)',
] as const;

/** Keep pointer travel between a tooltip and its trigger interactive. */
export const tooltipSafeArea = [
  'data-[side=top]:before:h-(--media-tooltip-side-offset) data-[side=bottom]:before:h-(--media-tooltip-side-offset)',
  'data-[side=left]:before:w-(--media-tooltip-side-offset) data-[side=right]:before:w-(--media-tooltip-side-offset)',
] as const;

/** Apply the scoped Skin surface contract without adding a runtime helper class. */
export const popupSurface = [
  'bg-media-popover text-media-popover-foreground backdrop-blur-lg backdrop-saturate-150',
  'ring-1 ring-media-border shadow-media-sm',
  'after:pointer-events-none after:absolute after:inset-0 after:z-10 after:rounded-[inherit]',
  'after:shadow-[inset_0_1px_0_0_rgb(255_255_255/0.1),inset_0_0_0_1px_rgb(255_255_255/0.05)]',
  '[@media(prefers-reduced-transparency:reduce)]:bg-media-background [@media(prefers-reduced-transparency:reduce)]:backdrop-filter-none',
  '[@media(prefers-reduced-transparency:reduce)]:after:shadow-[inset_0_1px_0_0_rgb(255_255_255/0.25),inset_0_0_0_1px_rgb(255_255_255/0.125)]',
  'contrast-more:bg-media-background contrast-more:backdrop-filter-none',
  'contrast-more:after:shadow-[inset_0_1px_0_0_rgb(255_255_255/0.25),inset_0_0_0_1px_rgb(255_255_255/0.125)]',
  'forced-colors:bg-[Canvas] forced-colors:text-[CanvasText] forced-colors:ring-[CanvasText]',
  'forced-colors:after:shadow-[inset_0_1px_0_0_CanvasText,inset_0_0_0_1px_CanvasText]',
] as const;

/** Apply the same surface recipe only once controls enter their large layout. */
export const popupSurfaceAtLarge = [
  '@lg/media-root:bg-media-popover @lg/media-root:text-media-popover-foreground',
  '@lg/media-root:backdrop-blur-lg @lg/media-root:backdrop-saturate-150',
  '@lg/media-root:ring-1 @lg/media-root:ring-media-border @lg/media-root:shadow-media-sm',
  '@lg/media-root:after:pointer-events-none @lg/media-root:after:absolute @lg/media-root:after:inset-0',
  '@lg/media-root:after:z-10 @lg/media-root:after:rounded-[inherit]',
  '@lg/media-root:after:shadow-[inset_0_1px_0_0_rgb(255_255_255/0.1),inset_0_0_0_1px_rgb(255_255_255/0.05)]',
  '@lg/media-root:[@media(prefers-reduced-transparency:reduce)]:bg-media-background',
  '@lg/media-root:[@media(prefers-reduced-transparency:reduce)]:backdrop-filter-none',
  '@lg/media-root:[@media(prefers-reduced-transparency:reduce)]:after:shadow-[inset_0_1px_0_0_rgb(255_255_255/0.25),inset_0_0_0_1px_rgb(255_255_255/0.125)]',
  '@lg/media-root:contrast-more:bg-media-background @lg/media-root:contrast-more:backdrop-filter-none',
  '@lg/media-root:contrast-more:after:shadow-[inset_0_1px_0_0_rgb(255_255_255/0.25),inset_0_0_0_1px_rgb(255_255_255/0.125)]',
  '@lg/media-root:forced-colors:bg-[Canvas] @lg/media-root:forced-colors:text-[CanvasText]',
  '@lg/media-root:forced-colors:ring-[CanvasText]',
  '@lg/media-root:forced-colors:after:shadow-[inset_0_1px_0_0_CanvasText,inset_0_0_0_1px_CanvasText]',
] as const;

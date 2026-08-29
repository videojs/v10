/** Position a popup from the side reported by the positioning primitive. */
export const popupPosition = [
  'm-0 overflow-visible border-0 text-inherit',
  'data-starting-style:opacity-0 data-starting-style:blur-xs data-starting-style:[transform:scale(.95)]',
  'data-ending-style:opacity-0 data-ending-style:blur-xs data-ending-style:[transform:scale(.95)]',
  'data-[side=top]:origin-bottom data-[side=bottom]:origin-top data-[side=left]:origin-right data-[side=right]:origin-left',
  'data-[side=top]:data-starting-style:[transform:translateY(var(--media-popup-translate-distance))_scale(.95)]',
  'data-[side=bottom]:data-starting-style:[transform:translateY(calc(var(--media-popup-translate-distance)*-1))_scale(.95)]',
  'data-[side=left]:data-starting-style:[transform:translateX(var(--media-popup-translate-distance))_scale(.95)]',
  'data-[side=right]:data-starting-style:[transform:translateX(calc(var(--media-popup-translate-distance)*-1))_scale(.95)]',
  'before:pointer-events-auto before:absolute',
  'data-[side=top]:before:inset-x-0 data-[side=top]:before:top-full',
  'data-[side=bottom]:before:inset-x-0 data-[side=bottom]:before:bottom-full',
  'data-[side=left]:before:inset-y-0 data-[side=left]:before:left-full',
  'data-[side=right]:before:inset-y-0 data-[side=right]:before:right-full',
] as const;

/** Animate popup presence while reducing motion to opacity-only timing. */
export const popupTransition = [
  'transition-[opacity,filter,transform,scale] duration-100 ease-out motion-reduce:duration-0',
  'data-ending-style:duration-50 motion-reduce:data-ending-style:duration-0',
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
  'ring-1 ring-media-border [box-shadow:var(--media-shadow-sm)]',
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
export const popupSurfaceAtLarge = popupSurface.map((group) =>
  group
    .split(' ')
    .map((utility) => `@lg/media-root:${utility}`)
    .join(' ')
);

import { cn } from '@videojs/utils/style';

export const title = {
  base: cn(
    // Layout — the block-end padding is the scrim's fade-out, not text spacing
    'absolute top-0 inset-x-0 pointer-events-none',
    'pt-4 px-6 pb-12 @2xl/media-root:pt-6 @2xl/media-root:px-8 @2xl/media-root:pb-16',
    // Type
    'truncate font-medium',
    // The CSS skin scales from `--size`; the Tailwind root inlines that value.
    'text-(length:--font-size-medium) @2xl/media-root:text-[calc(1rem*var(--scale))]',
    '[color:var(--media-color-primary,oklch(1_0_0))]',
    '[text-shadow:0_1px_0_var(--media-current-shadow-color)]',
    // Scrim
    'bg-linear-to-b from-black/50 to-transparent',
    // Transitions — speed up the entry transition, like the controls do
    'origin-top ease-(--media-controls-transition-timing-function)',
    'duration-[calc(var(--media-controls-transition-duration)/2)]',
    'pointer-fine:will-change-[filter,opacity,scale,translate]',
    'pointer-fine:transition-[filter,opacity,scale,translate]',
    'pointer-coarse:will-change-[opacity,scale,translate]',
    'pointer-coarse:transition-[opacity,scale,translate]',
    // Leaves with the secondary controls, which share the top of the player
    'not-data-visible:opacity-0',
    'not-data-visible:duration-(--media-controls-transition-duration)',
    'motion-safe:not-data-visible:scale-95',
    'motion-safe:not-data-visible:-translate-y-1',
    'pointer-fine:motion-safe:not-data-visible:blur-sm',
    // No text to read, so no scrim to darken the video with
    'not-data-has-title:hidden',
    'peer-data-open/error:hidden'
  ),

  /**
   * Reserves room for the secondary controls the video skin pins to the
   * top-right below `@lg`, so a long title ellipsises instead of sliding
   * underneath them.
   */
  offsetControls: '@max-lg/media-root:pe-44',
};

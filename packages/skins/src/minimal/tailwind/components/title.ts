import { cn } from '@videojs/utils/style';

export const title = cn(
  // Layout — the block-end padding is the scrim's fade-out, not text spacing
  'absolute top-0 inset-x-0 pointer-events-none',
  'pt-3 px-4 pb-10 @2xl/media-root:pt-4 @2xl/media-root:px-6 @2xl/media-root:pb-14',
  // Type
  'truncate font-medium text-white',
  // The CSS skin scales from `--size`; the Tailwind root inlines that value.
  'text-(length:--font-size-medium) @2xl/media-root:text-[calc(1rem*var(--scale))]',
  '[text-shadow:0_1px_0_var(--media-current-shadow-color)]',
  // Scrim
  'bg-linear-to-b from-black/70 to-transparent',
  // Transitions — speed up the entry transition, like the controls do
  'ease-(--media-controls-transition-timing-function)',
  'duration-[calc(var(--media-controls-transition-duration)/2)]',
  'pointer-fine:will-change-[translate,filter,opacity]',
  'pointer-fine:transition-[translate,filter,opacity]',
  'pointer-coarse:will-change-[translate,opacity]',
  'pointer-coarse:transition-[translate,opacity]',
  // Slides off the top edge, mirroring the control bar leaving the bottom
  'not-data-visible:opacity-0',
  'not-data-visible:duration-(--media-controls-transition-duration)',
  'motion-safe:not-data-visible:-translate-y-full',
  'pointer-fine:motion-safe:not-data-visible:blur-sm',
  // No text to read, so no scrim to darken the video with
  'not-data-has-title:hidden',
  'peer-data-open/error:hidden'
);

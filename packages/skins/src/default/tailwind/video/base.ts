import { cn } from '@videojs/utils/style';
import { container as baseContainer } from '../components/container';
import { controls as baseControls } from '../components/controls';
import { surface } from '../components/surface';

export const container = cn(
  baseContainer,
  'bg-black overflow-clip',
  // Inner border ring
  'after:absolute after:pointer-events-none after:rounded-[inherit] after:z-10',
  'after:inset-0 after:ring-1 after:ring-inset after:ring-black/10 dark:after:ring-white/15',
  // Video element
  '[&_video]:block [&_video]:w-full [&_video]:h-full [&_video]:rounded-[inherit] [&_video]:[object-fit:var(--media-object-fit,contain)] [&_video]:[object-position:var(--media-object-position,center)]',
  // Native caption track container
  '[&_video::-webkit-media-text-track-container]:transition-[translate]',
  '[&_video::-webkit-media-text-track-container]:duration-(--media-caption-track-duration)',
  '[&_video::-webkit-media-text-track-container]:ease-out',
  '[&_video::-webkit-media-text-track-container]:delay-(--media-caption-track-delay)',
  '[&_video::-webkit-media-text-track-container]:translate-y-(--media-caption-track-y)',
  '[&_video::-webkit-media-text-track-container]:scale-98',
  '[&_video::-webkit-media-text-track-container]:z-1',
  '[&_video::-webkit-media-text-track-container]:font-[inherit]',
  // Fullscreen
  '[&:fullscreen]:[--media-border-radius:0]',
  '[&:fullscreen_video]:object-contain'
);

export const controls = cn(
  baseControls,
  surface,
  // Position & wrapping layout (small)
  'absolute bottom-2 inset-x-2 flex-wrap',
  '[color:var(--media-color-primary,oklch(1_0_0))] z-10',
  'peer-data-open/error:hidden',
  'ease-(--media-controls-transition-timing-function) origin-bottom',
  'duration-(--media-controls-transition-duration)',
  'pointer-fine:will-change-[scale,filter,opacity]',
  'pointer-fine:transition-[scale,filter,opacity]',
  'pointer-coarse:will-change-[scale,opacity]',
  'pointer-coarse:transition-[scale,opacity]',
  // Hidden state
  'not-data-visible:pointer-events-none not-data-visible:opacity-0',
  'motion-safe:not-data-visible:scale-90',
  'pointer-fine:motion-safe:not-data-visible:blur-sm',
  // Single-row layout (large)
  '@2xl/media-container:bottom-3 @2xl/media-container:inset-x-3 @2xl/media-container:flex-nowrap @2xl/media-container:gap-x-0.5 @2xl/media-container:p-1'
);

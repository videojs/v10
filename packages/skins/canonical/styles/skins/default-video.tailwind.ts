import { defaultSurface } from '../components/popup.tailwind';
import { defineStyles } from '../define';

const defaultSurfaceAtLarge = defaultSurface.map((group) =>
  group
    .split(/\s+/)
    .map((utility) => `@lg/media-root:${utility}`)
    .join(' ')
);

export default defineStyles({
  role: 'controls',
  styles: {
    controls: {
      root: [
        'peer/controls group/controls contents text-white',
        '[--media-popover-side-offset:--spacing(3)]',
        '[--media-tooltip-side-offset:var(--media-popover-side-offset)]',
        '[--media-popover-boundary-offset:0.75rem] [--media-tooltip-boundary-offset:var(--media-popover-boundary-offset)]',
        '@lg/media-root:absolute @lg/media-root:inset-x-2 @lg/media-root:bottom-2 @lg/media-root:z-10',
        '@lg/media-root:flex @lg/media-root:items-center @lg/media-root:rounded-media-control',
        ...defaultSurfaceAtLarge,
        '@2xl/media-root:inset-x-3 @2xl/media-root:bottom-3',
        '@lg/media-root:not-data-visible:pointer-events-none @lg/media-root:not-data-visible:opacity-0',
        '@lg/media-root:motion-safe:not-data-visible:scale-95 @lg/media-root:motion-safe:not-data-visible:translate-y-1',
        '@lg/media-root:pointer-fine:motion-safe:not-data-visible:blur-sm',
        'transition-[filter,opacity,scale,translate] duration-(--media-controls-transition-duration) ease-out',
        'peer-data-open/error:hidden!',
      ],
      primary: [
        'absolute inset-x-2 bottom-2 z-10 flex origin-bottom items-center rounded-media-control',
        ...defaultSurface,
        'p-1',
        '@lg/media-root:contents',
        '@max-lg/media-root:group-[:not([data-visible])]/controls:pointer-events-none',
        '@max-lg/media-root:group-[:not([data-visible])]/controls:opacity-0',
        '@max-lg/media-root:motion-safe:group-[:not([data-visible])]/controls:scale-95',
        '@max-lg/media-root:motion-safe:group-[:not([data-visible])]/controls:translate-y-1',
        'transition-[filter,opacity,scale,translate] duration-(--media-controls-transition-duration) ease-out',
      ],
      secondary: [
        'absolute top-2 right-2 z-10 flex origin-top items-center rounded-media-control',
        ...defaultSurface,
        'p-1',
        '@lg/media-root:contents',
        '@max-lg/media-root:group-[:not([data-visible])]/controls:pointer-events-none',
        '@max-lg/media-root:group-[:not([data-visible])]/controls:opacity-0',
        '@max-lg/media-root:motion-safe:group-[:not([data-visible])]/controls:scale-95',
        '@max-lg/media-root:motion-safe:group-[:not([data-visible])]/controls:-translate-y-1',
        'transition-[filter,opacity,scale,translate] duration-(--media-controls-transition-duration) ease-out',
      ],
    },
    buttonGroup: 'flex items-center gap-px',
    timeControls: [
      '@container/media-time flex flex-1 items-center gap-2.5 px-3',
      '@max-[16rem]/media-time:[&>*:last-child]:hidden',
    ],
    time: {
      current: 'tabular-nums',
      remaining: [
        'cursor-pointer tabular-nums rounded-sm outline-2 -outline-offset-2 outline-transparent',
        'focus-visible:outline-current focus-visible:outline-offset-2',
      ],
    },
  },
});

import { styles } from 'vjsc/styles';

import { popupSurface, popupSurfaceAtLarge } from '../../styles/recipes/popup';

export default styles({
  file: 'controls.css',
  rules: {
    provider: {
      className: 'media-controls-provider',
      utilities: 'contents',
    },
    root: {
      className: 'media-controls',
      utilities: [
        'group/controls contents p-1 text-white',
        '[--media-popover-side-offset:--spacing(3)] [--media-tooltip-side-offset:var(--media-popover-side-offset)]',
        '[--media-popover-boundary-offset:0.75rem] [--media-tooltip-boundary-offset:var(--media-popover-boundary-offset)]',
        '@lg/media-root:absolute @lg/media-root:inset-x-2 @lg/media-root:bottom-2 @lg/media-root:z-10',
        '@lg/media-root:flex @lg/media-root:items-center @lg/media-root:gap-px @lg/media-root:rounded-media-control',
        'text-shadow-[0_1px_0_var(--media-shadow-current-color)]',
        ...popupSurfaceAtLarge,
        '@2xl/media-root:inset-x-3 @2xl/media-root:bottom-3',
        '@lg/media-root:not-data-visible:pointer-events-none @lg/media-root:not-data-visible:opacity-0',
        '@lg/media-root:motion-safe:not-data-visible:scale-95 @lg/media-root:motion-safe:not-data-visible:translate-y-1',
        '@lg/media-root:pointer-fine:motion-safe:not-data-visible:blur-sm',
        'transition-[filter,opacity,scale,translate] duration-[calc(var(--media-controls-transition-duration)/2)] ease-out',
        '@lg/media-root:not-data-visible:duration-(--media-controls-transition-duration)',
      ],
    },
    backdrop: {
      className: 'media-controls__backdrop',
      utilities: [
        'pointer-events-none absolute inset-0 z-10 rounded-[inherit]',
        'bg-linear-to-t from-black/50 via-black/30 via-25% to-transparent',
        'transition-opacity duration-(--media-controls-transition-duration) ease-out not-data-visible:opacity-0',
      ],
    },
    primary: {
      className: 'media-controls-primary',
      utilities: [
        ...popupSurface,
        'absolute inset-x-2 bottom-2 z-10 flex origin-bottom items-center gap-px rounded-media-control p-1',
        '@lg/media-root:contents',
        '@lg/media-root:rounded-none @lg/media-root:bg-transparent @lg/media-root:shadow-none @lg/media-root:ring-0',
        '@lg/media-root:backdrop-filter-none @lg/media-root:after:hidden',
        '@max-lg/media-root:group-[:not([data-visible])]/controls:pointer-events-none',
        '@max-lg/media-root:group-[:not([data-visible])]/controls:opacity-0',
        '@max-lg/media-root:motion-safe:group-[:not([data-visible])]/controls:scale-95',
        '@max-lg/media-root:motion-safe:group-[:not([data-visible])]/controls:translate-y-1',
        '@max-lg/media-root:pointer-fine:motion-safe:group-[:not([data-visible])]/controls:blur-sm',
        'transition-[filter,opacity,scale,translate] duration-[calc(var(--media-controls-transition-duration)/2)] ease-out',
        '@max-lg/media-root:group-[:not([data-visible])]/controls:duration-(--media-controls-transition-duration)',
      ],
    },
    spacer: {
      className: 'media-controls-spacer',
      utilities: 'flex-1',
    },
    captionsMenu: {
      className: 'media-controls-captions-menu',
      utilities: '@max-lg/media-root:hidden',
    },
  },
});

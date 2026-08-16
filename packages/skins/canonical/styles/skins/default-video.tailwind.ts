import { defineStyles } from '../define';

export default defineStyles({
  role: 'controls',
  styles: {
    controls: {
      root: [
        'peer/controls group/controls contents text-white',
        '[--media-popover-side-offset:calc(0.5rem+var(--media-controls-padding))]',
        '[--media-tooltip-side-offset:var(--media-popover-side-offset)]',
        '[--media-popover-boundary-offset:0.75rem] [--media-tooltip-boundary-offset:var(--media-popover-boundary-offset)]',
        '@lg/media-root:absolute @lg/media-root:inset-x-2 @lg/media-root:bottom-2 @lg/media-root:z-10',
        '@lg/media-root:flex @lg/media-root:items-center @lg/media-root:rounded-media-pill',
        '@lg/media-root:bg-media-surface @lg/media-root:shadow-media-surface @lg/media-root:[backdrop-filter:blur(var(--media-surface-backdrop-blur))_saturate(var(--media-surface-backdrop-saturate))]',
        '@2xl/media-root:inset-x-3 @2xl/media-root:bottom-3',
        '@lg/media-root:not-data-visible:pointer-events-none @lg/media-root:not-data-visible:opacity-0',
        '@lg/media-root:motion-safe:not-data-visible:scale-95 @lg/media-root:motion-safe:not-data-visible:translate-y-1',
        '@lg/media-root:pointer-fine:motion-safe:not-data-visible:blur-sm',
        '[transition-property:filter,opacity,scale,translate] [transition-duration:var(--media-controls-transition-duration)] [transition-timing-function:ease-out]',
        'peer-data-open/error:hidden!',
      ],
      primary: [
        'absolute inset-x-2 bottom-2 z-10 flex origin-bottom items-center rounded-media-pill',
        'bg-media-surface p-media-controls-padding shadow-media-surface [backdrop-filter:blur(var(--media-surface-backdrop-blur))_saturate(var(--media-surface-backdrop-saturate))]',
        '@lg/media-root:contents',
        '@max-lg/media-root:group-[:not([data-visible])]/controls:pointer-events-none',
        '@max-lg/media-root:group-[:not([data-visible])]/controls:opacity-0',
        '@max-lg/media-root:motion-safe:group-[:not([data-visible])]/controls:scale-95',
        '@max-lg/media-root:motion-safe:group-[:not([data-visible])]/controls:translate-y-1',
        '[transition-property:filter,opacity,scale,translate] [transition-duration:var(--media-controls-transition-duration)] [transition-timing-function:ease-out]',
      ],
      secondary: [
        'absolute top-2 right-2 z-10 flex origin-top items-center rounded-media-pill',
        'bg-media-surface p-media-controls-padding shadow-media-surface [backdrop-filter:blur(var(--media-surface-backdrop-blur))_saturate(var(--media-surface-backdrop-saturate))]',
        '@lg/media-root:contents',
        '@max-lg/media-root:group-[:not([data-visible])]/controls:pointer-events-none',
        '@max-lg/media-root:group-[:not([data-visible])]/controls:opacity-0',
        '@max-lg/media-root:motion-safe:group-[:not([data-visible])]/controls:scale-95',
        '@max-lg/media-root:motion-safe:group-[:not([data-visible])]/controls:-translate-y-1',
        '[transition-property:filter,opacity,scale,translate] [transition-duration:var(--media-controls-transition-duration)] [transition-timing-function:ease-out]',
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

import { defineStyles } from '../define';

export default defineStyles({
  role: 'controls',
  styles: {
    controls: {
      root: [
        'peer/controls group/controls absolute inset-x-1 bottom-1 z-20 flex flex-wrap items-center gap-x-2 rounded-xl bg-media-controls-background text-white',
        '[--media-popover-side-offset:1.25rem] [--media-tooltip-side-offset:var(--media-popover-side-offset)]',
        '[--media-popover-boundary-offset:0.25rem] [--media-tooltip-boundary-offset:var(--media-popover-boundary-offset)]',
        'p-media-controls-padding [transition-property:filter,opacity,translate]',
        '[transition-duration:calc(var(--media-controls-transition-duration)/2)] [transition-timing-function:ease-out]',
        'not-data-visible:pointer-events-none not-data-visible:opacity-0',
        'not-data-visible:[transition-duration:var(--media-controls-transition-duration)]',
        'motion-safe:not-data-visible:translate-y-full pointer-fine:motion-safe:not-data-visible:blur-sm',
        '@2xl/media-root:inset-x-2 @2xl/media-root:bottom-2 @2xl/media-root:flex-nowrap',
        '@2xl/media-root:[--media-popover-side-offset:0.75rem]',
        'peer-data-open/error:hidden!',
      ],
      start: 'flex flex-1 items-center gap-px @2xl/media-root:flex-none',
      end: 'flex flex-1 items-center justify-end gap-px @2xl/media-root:flex-none',
      remote: 'hidden items-center gap-px @lg/media-root:flex',
    },
    timeControls: [
      '@container/media-time-controls order-first flex basis-full flex-row-reverse items-center gap-3 px-1.5',
      '@2xl/media-root:order-none @2xl/media-root:min-w-0 @2xl/media-root:flex-1 @2xl/media-root:basis-0 @2xl/media-root:flex-row',
      '@2xl/media-root:[mask-position:100%_0] @2xl/media-root:[mask-size:200%_100%]',
      '@2xl/media-root:[transition:mask-position_50ms_ease-out]',
      'group-has-[[data-volume-level][aria-expanded=true]]/controls:@2xl/media-root:[mask-image:linear-gradient(to_right,transparent_10%,black_25%,black_100%)]',
      'group-has-[[data-volume-level][aria-expanded=true]]/controls:@2xl/media-root:[mask-position:0_0]',
    ],
    time: {
      group: 'flex items-center gap-1',
      current: [
        'hidden cursor-pointer rounded-sm tabular-nums outline-2 -outline-offset-2 outline-transparent',
        'focus-visible:outline-current focus-visible:outline-offset-2 @2xl/media-root:inline',
      ],
      separator: 'hidden text-current/60 @2xl/media-root:inline',
      duration: 'tabular-nums text-current/60',
    },
  },
});

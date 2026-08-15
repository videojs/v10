import { defineStyles } from '../define';

const popupBase = [
  'm-0 overflow-visible border-0 text-inherit',
  '[--popup-translate-distance:0.5rem]',
  '[transition-property:opacity,filter,transform,scale] [transition-duration:var(--popup-transition-duration)] [transition-timing-function:ease-out]',
  'data-starting-style:opacity-0 data-starting-style:[filter:blur(4px)] data-starting-style:scale-95',
  'data-ending-style:opacity-0 data-ending-style:[filter:blur(4px)] data-ending-style:scale-95',
  'data-[side=top]:origin-bottom data-[side=bottom]:origin-top data-[side=left]:origin-right data-[side=right]:origin-left',
  'before:pointer-events-auto before:absolute',
  'data-[side=top]:before:inset-x-0 data-[side=top]:before:top-full',
  'data-[side=bottom]:before:inset-x-0 data-[side=bottom]:before:bottom-full',
  'data-[side=left]:before:inset-y-0 data-[side=left]:before:left-full',
  'data-[side=right]:before:inset-y-0 data-[side=right]:before:right-full',
];

export default defineStyles({
  role: 'popups',
  styles: {
    surface: [
      'relative bg-media-surface text-media-controls shadow-media-surface backdrop-blur-media-surface',
      'after:pointer-events-none after:absolute after:inset-0 after:z-10 after:rounded-[inherit]',
      'after:shadow-[inset_0_1px_0_0_var(--media-surface-border)]',
    ],
    popover: [
      ...popupBase,
      'data-[side=top]:before:h-(--media-popover-side-offset) data-[side=bottom]:before:h-(--media-popover-side-offset)',
      'data-[side=left]:before:w-(--media-popover-side-offset) data-[side=right]:before:w-(--media-popover-side-offset)',
    ],
    tooltip: [
      ...popupBase,
      'm-0 whitespace-nowrap rounded-media-pill border-0 px-2.5 py-[0.35rem]',
      'data-open:flex data-open:items-center data-open:gap-1',
      'data-[side=top]:before:h-(--media-tooltip-side-offset) data-[side=bottom]:before:h-(--media-tooltip-side-offset)',
      'data-[side=left]:before:w-(--media-tooltip-side-offset) data-[side=right]:before:w-(--media-tooltip-side-offset)',
    ],
    tooltipShortcut: 'min-w-6 rounded-sm bg-current/30 p-[0.1em] text-center text-[0.75em] font-semibold leading-tight',
    volumePopover: [
      ...popupBase,
      'rounded-media-pill py-3',
      'data-[side=right]:bg-transparent data-[side=right]:p-0 data-[side=right]:shadow-none data-[side=right]:backdrop-blur-none data-[side=right]:after:hidden',
      'data-[side=top]:before:h-(--media-popover-side-offset) data-[side=bottom]:before:h-(--media-popover-side-offset)',
      'data-[side=left]:before:w-(--media-popover-side-offset) data-[side=right]:before:w-(--media-popover-side-offset)',
      'has-[media-volume-slider[data-hidden]]:hidden',
    ],
  },
});

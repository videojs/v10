import { styles } from 'vjsc/styles';

const timeButton = [
  'cursor-pointer rounded-sm tabular-nums outline-2 -outline-offset-2 outline-transparent',
  'transition-[outline-color,outline-offset] duration-100 ease-out motion-reduce:duration-50',
  'focus-visible:outline-[var(--media-focus-ring-color)] focus-visible:outline-offset-2',
] as const;

export default styles({
  file: 'controls.css',
  layer: 'videojs.components',
  rules: {
    root: {
      className: 'media-controls-content',
      utilities: [
        'relative z-20 flex items-center rounded-media-control p-1 [color:var(--media-audio-text-color)]',
        'text-shadow-[0_1px_0_var(--media-shadow-current-color)]',
        '[--media-popover-side-offset:--spacing(3)] [--media-tooltip-side-offset:var(--media-popover-side-offset)]',
        '[--media-popover-boundary-offset:--spacing(2)] [--media-tooltip-boundary-offset:var(--media-popover-boundary-offset)]',
      ],
    },
    start: {
      className: 'media-controls-start',
      utilities: 'flex items-center gap-px',
    },
    end: {
      className: 'media-controls-end',
      utilities: 'flex items-center gap-px',
    },
    seekButton: {
      className: 'media-audio-seek-button',
      utilities: '@max-[32rem]/media-root:hidden',
    },
    timeSliderGroup: {
      className: 'media-time-slider-group',
      utilities: '@container/media-time-controls flex min-w-0 flex-1 items-center gap-2.5 px-3',
    },
    currentValue: {
      className: 'media-time-current-value',
      utilities: 'tabular-nums',
    },
    remainingValue: {
      className: 'media-time-remaining-value',
      utilities: [...timeButton, '@max-[16rem]/media-time-controls:hidden'],
    },
  },
});

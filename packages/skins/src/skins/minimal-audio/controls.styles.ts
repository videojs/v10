import { styles } from 'vjsc/styles';

const timeButton = [
  'cursor-pointer rounded-sm tabular-nums outline-2 -outline-offset-2 outline-transparent',
  'supports-[corner-shape:squircle]:rounded-2xl supports-[corner-shape:squircle]:[corner-shape:squircle]',
  'transition-[outline-color,outline-offset] duration-100 ease-out motion-reduce:duration-50',
  'focus-visible:outline-[var(--media-focus-ring-color)] focus-visible:outline-offset-2',
] as const;

export default styles({
  file: 'audio/controls.css',
  rules: {
    content: {
      className: 'audio-controls-content',
      utilities: [
        'after:hidden!',
        'relative z-20 flex items-center gap-2 rounded-[--spacing(3.5)] bg-media-controls p-1 text-media-controls-foreground',
        'shadow-[0_0_0_1px_var(--media-border)]',
        'text-shadow-media',
        '[--media-popover-side-offset:--spacing(3)] [--media-tooltip-side-offset:var(--media-popover-side-offset)]',
        '[--media-popover-boundary-offset:--spacing(3)] [--media-tooltip-boundary-offset:var(--media-popover-boundary-offset)]',
      ],
    },
    start: {
      className: 'audio-controls-start',
      utilities: 'flex items-center gap-px',
    },
    end: {
      className: 'audio-controls-end',
      utilities: 'flex items-center gap-px',
    },
    timeSliderGroup: {
      className: 'audio-time-slider-group',
      utilities: [
        '@container/audio-time-controls flex min-w-0 flex-1 flex-row-reverse items-center gap-3',
        '@min-[42.001rem]/media-root:flex-row',
      ],
    },
    timeGroup: {
      className: 'audio-time-group',
      utilities: 'flex items-center gap-1',
    },
    currentValue: {
      className: 'audio-time-current-value',
      utilities: [...timeButton, 'hidden @min-[42.001rem]/media-root:inline'],
    },
    timeSeparator: {
      className: 'audio-time-separator',
      utilities: ['hidden', '@min-[42.001rem]/media-root:inline @min-[42.001rem]/media-root:text-current/60'],
    },
    durationValue: {
      className: 'audio-time-duration-value',
      utilities: 'tabular-nums @min-[42.001rem]/media-root:text-current/60',
    },
  },
});

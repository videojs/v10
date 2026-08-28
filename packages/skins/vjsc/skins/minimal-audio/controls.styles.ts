import { styles } from 'vjsc/styles';

const minimalSurface = [
  'text-white backdrop-blur-lg backdrop-saturate-150',
  'after:pointer-events-none after:absolute after:inset-0 after:z-10 after:rounded-[inherit]',
  'after:shadow-[inset_0_1px_0_0_rgb(255_255_255/0.1),inset_0_0_0_1px_rgb(255_255_255/0.05)]',
  '[@media(prefers-reduced-transparency:reduce)]:bg-black [@media(prefers-reduced-transparency:reduce)]:ring-1 [@media(prefers-reduced-transparency:reduce)]:ring-transparent',
  '[@media(prefers-reduced-transparency:reduce)]:backdrop-filter-none',
  '[@media(prefers-reduced-transparency:reduce)]:after:shadow-[inset_0_1px_0_0_rgb(255_255_255/0.25),inset_0_0_0_1px_rgb(255_255_255/0.125)]',
  'contrast-more:bg-black contrast-more:ring-1 contrast-more:ring-transparent contrast-more:backdrop-filter-none',
  'contrast-more:after:shadow-[inset_0_1px_0_0_rgb(255_255_255/0.25),inset_0_0_0_1px_rgb(255_255_255/0.125)]',
  'forced-colors:bg-[Canvas] forced-colors:ring-1 forced-colors:ring-[CanvasText]',
  'forced-colors:after:shadow-[inset_0_1px_0_0_CanvasText,inset_0_0_0_1px_CanvasText]',
  'shadow-sm shadow-black/20 ring-1 ring-white/10',
  '[@media(prefers-reduced-transparency:reduce)]:shadow-sm [@media(prefers-reduced-transparency:reduce)]:shadow-black/20',
  'contrast-more:shadow-sm contrast-more:shadow-black/20',
  'forced-colors:shadow-sm forced-colors:shadow-black/20',
  'bg-black/50',
] as const;

const minimalAudioSurface = [
  'bg-(--media-audio-controls-background-color)! [color:var(--media-audio-text-color)]!',
  'shadow-sm shadow-black/20 ring-1 ring-[light-dark(rgb(0_0_0/0.1),rgb(255_255_255/0.1))]',
  'backdrop-blur-lg backdrop-saturate-150',
  '[@media(prefers-reduced-transparency:reduce)]:backdrop-filter-none',
  'contrast-more:backdrop-filter-none',
] as const;

const timeButton = [
  'cursor-pointer rounded-sm tabular-nums outline-2 -outline-offset-2 outline-transparent',
  'supports-[corner-shape:squircle]:rounded-2xl supports-[corner-shape:squircle]:[corner-shape:squircle]',
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
        'relative z-20 flex items-center gap-2 rounded-[--spacing(3.5)] p-1 [color:var(--media-audio-text-color)]',
        'text-shadow-[0_1px_0_var(--media-shadow-current-color)]',
        '[--media-popover-side-offset:--spacing(3)] [--media-tooltip-side-offset:var(--media-popover-side-offset)]',
        '[--media-popover-boundary-offset:--spacing(3)] [--media-tooltip-boundary-offset:var(--media-popover-boundary-offset)]',
      ],
      variants: {
        minimal: minimalSurface,
        'minimal-audio': minimalAudioSurface,
      },
    },
    start: {
      className: 'media-controls-start',
      utilities: 'flex items-center gap-px',
    },
    end: {
      className: 'media-controls-end',
      utilities: 'flex items-center gap-px',
    },
    timeSliderGroup: {
      className: 'media-time-slider-group',
      utilities: [
        '@container/media-time-controls flex min-w-0 flex-1 flex-row-reverse items-center gap-3',
        '@min-[42.001rem]/media-root:flex-row',
      ],
    },
    timeGroup: {
      className: 'media-time-group',
      utilities: 'flex items-center gap-1',
    },
    currentValue: {
      className: 'media-time-current-value',
      utilities: [...timeButton, 'hidden @min-[42.001rem]/media-root:inline'],
    },
    timeSeparator: {
      className: 'media-time-separator',
      utilities: ['hidden', '@min-[42.001rem]/media-root:inline @min-[42.001rem]/media-root:text-current/60'],
    },
    durationValue: {
      className: 'media-time-duration-value',
      utilities: 'tabular-nums @min-[42.001rem]/media-root:text-current/60',
    },
  },
});

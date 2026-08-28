import { styles } from 'vjsc/styles';

const sliderPreviewContent = [
  'absolute max-w-(--media-slider-preview-max-width) -translate-x-1/2 translate-y-2 scale-80 opacity-0',
  'origin-bottom blur-sm',
  'motion-safe:transition-[filter,opacity,scale] motion-safe:duration-150 motion-safe:ease-out',
  'group-data-pointing/preview:scale-100 group-data-pointing/preview:opacity-100 group-data-pointing/preview:filter-none',
  'group-has-focus-visible/slider:scale-100 group-has-focus-visible/slider:opacity-100 group-has-focus-visible/slider:filter-none',
] as const;

const defaultSurface = [
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
  'shadow-sm shadow-black/15 ring-1 ring-black/10',
  '[@media(prefers-reduced-transparency:reduce)]:shadow-sm [@media(prefers-reduced-transparency:reduce)]:shadow-black/15',
  'contrast-more:shadow-sm contrast-more:shadow-black/15',
  'forced-colors:shadow-sm forced-colors:shadow-black/15',
  'bg-white/10',
] as const;

const minimalTooltipSurface = [
  'bg-black/50 backdrop-blur-lg backdrop-saturate-150',
  'shadow-md shadow-black/20 ring-1 ring-white/10',
  '[@media(prefers-reduced-transparency:reduce)]:bg-black [@media(prefers-reduced-transparency:reduce)]:backdrop-filter-none',
  'contrast-more:bg-black contrast-more:backdrop-filter-none',
] as const;

const defaultAudioSurface = [
  'bg-(--media-audio-controls-background-color)! [color:var(--media-audio-text-color)]!',
  'shadow-sm shadow-black/15 ring-1 ring-black/10',
  'backdrop-blur-lg backdrop-saturate-150',
  '[@media(prefers-reduced-transparency:reduce)]:bg-[light-dark(white,black)]!',
  'contrast-more:bg-[light-dark(white,black)]!',
] as const;

const minimalAudioSurface = [
  'bg-(--media-audio-controls-background-color)! [color:var(--media-audio-text-color)]!',
  'shadow-sm shadow-black/20 ring-1 ring-[light-dark(rgb(0_0_0/0.1),rgb(255_255_255/0.1))]',
  'backdrop-blur-lg backdrop-saturate-150',
  '[@media(prefers-reduced-transparency:reduce)]:backdrop-filter-none',
  'contrast-more:backdrop-filter-none',
] as const;

export default styles({
  file: 'sliders.css',
  layer: 'videojs.components',
  rules: {
    root: {
      className: 'media-audio-time-slider',
      utilities: [],
    },
    previewContent: {
      className: 'media-audio-time-slider-preview-content',
      utilities: [
        ...sliderPreviewContent,
        'left-(--media-slider-pointer) bottom-[calc(100%+--spacing(10))] rounded-media-control px-2.5 py-1 tabular-nums',
        'text-media',
      ],
      variants: {
        default: defaultSurface,
        minimal: [...minimalTooltipSurface, 'rounded-[--spacing(2)] px-2'],
        'default-audio': defaultAudioSurface,
        'default-live-audio': defaultAudioSurface,
        'minimal-audio': minimalAudioSurface,
        'minimal-live-audio': minimalAudioSurface,
      },
    },
    value: {
      className: 'media-audio-time-slider-value',
      utilities: 'tabular-nums',
    },
  },
});

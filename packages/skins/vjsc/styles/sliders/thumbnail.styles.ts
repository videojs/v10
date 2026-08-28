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

export default styles({
  file: 'sliders.css',
  layer: 'videojs.components',
  rules: {
    root: {
      className: 'media-slider-thumbnail',
      utilities: [
        ...sliderPreviewContent,
        'group/thumbnail pointer-events-none overflow-hidden',
        'has-[[data-loading]]:aspect-video has-[[data-loading]]:w-(--media-slider-preview-max-width)',
      ],
      variants: {
        default: [...defaultSurface, 'left-1/2 bottom-[calc(100%+--spacing(9))] rounded-xl bg-black/90'],
        minimal:
          '[left:var(--media-preview-left,var(--media-slider-pointer))] bottom-[calc(100%+--spacing(14))] rounded-lg bg-black/90',
      },
    },
    image: {
      className: 'media-slider-thumbnail-image',
      utilities: [
        'relative block max-h-(--media-slider-preview-max-height) max-w-(--media-slider-preview-max-width) overflow-clip rounded-[inherit]',
        'transition-opacity duration-150 ease-out motion-reduce:duration-50',
        'data-loading:opacity-0',
      ],
    },
    spinnerIcon: {
      className: 'media-slider-thumbnail-spinner-icon',
      utilities: [
        'absolute top-1/2 left-1/2 size-media-icon -translate-x-1/2 -translate-y-1/2 opacity-0',
        'transition-opacity duration-150 ease-out',
        'group-not-has-[[role=img][data-loading]]/thumbnail:[--media-spinner-animation:none]',
        'motion-reduce:[--media-spinner-animation:none]',
        'group-has-[[role=img][data-loading]]/thumbnail:opacity-100',
        'drop-shadow-[0_1px_0_var(--media-shadow-current-color)]',
      ],
    },
  },
});

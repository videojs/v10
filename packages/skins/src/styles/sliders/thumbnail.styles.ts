import { styles } from 'vjsc/styles';

export default styles({
  file: 'sliders.css',
  prefix: 'media-slider-thumbnail',
  rules: {
    root: {
      utilities: [
        'group/thumbnail pointer-events-none overflow-hidden rounded-media-popup bg-media-scrim/90',
        'bottom-[calc(100%+var(--media-slider-preview-offset))]',
        'has-[[data-loading]]:aspect-video has-[[data-loading]]:w-(--media-slider-preview-max-width)',
      ],
      variants: {
        default: 'left-1/2',
        minimal: '[left:var(--media-preview-left,var(--media-slider-pointer))]',
      },
    },
    image: {
      utilities: [
        'relative block max-h-(--media-slider-preview-max-height) max-w-(--media-slider-preview-max-width) overflow-clip rounded-[inherit]',
        'transition-opacity duration-media-base ease-out',
        'data-loading:opacity-0',
      ],
    },
    spinnerIcon: {
      utilities: [
        'absolute top-1/2 left-1/2 size-media-icon -translate-x-1/2 -translate-y-1/2 opacity-0',
        'transition-opacity duration-media-base ease-out',
        'group-not-has-[[role=img][data-loading]]/thumbnail:[--media-spinner-animation:none]',
        'group-has-[[role=img][data-loading]]/thumbnail:opacity-100',
        'drop-shadow-media-icon',
      ],
    },
  },
});

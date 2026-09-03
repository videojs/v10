import { styles } from 'vjsc/styles';

export default styles({
  file: 'sliders.css',
  prefix: 'media-slider-thumbnail',
  rules: {
    // The root is the box the thumbnail core measures, so it carries the size limits. React reports
    // `data-loading` on the root itself; the HTML root is still a plain wrapper around
    // `<media-slider-thumbnail>`, which reports loading and measures itself, so the descendant
    // selectors and the Shadow DOM image variant stay until that element becomes the root.
    root: {
      utilities: [
        'group/thumbnail pointer-events-none overflow-hidden rounded-media-popup bg-media-backdrop/90',
        'bottom-[calc(100%+var(--media-slider-preview-offset))]',
        'max-h-(--media-slider-preview-max-height)',
        'data-loading:aspect-video data-loading:w-(--media-slider-preview-max-width)',
        'has-[[data-loading]]:aspect-video has-[[data-loading]]:w-(--media-slider-preview-max-width)',
      ],
      variants: {
        default: [
          'left-1/2',
          'after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:bg-(image:--media-thumbnail-gradient)',
        ],
        minimal: '[left:var(--media-preview-left,var(--media-slider-pointer))]',
      },
    },
    image: {
      utilities: [
        'block transition-opacity duration-media-base ease-out',
        'group-data-loading/thumbnail:opacity-0 data-loading:opacity-0',
      ],
      variants: {
        'shadow-dom':
          'relative max-h-(--media-slider-preview-max-height) max-w-(--media-slider-preview-max-width) overflow-clip rounded-[inherit]',
      },
    },
    spinnerIcon: {
      utilities: [
        'absolute top-1/2 left-1/2 z-10 size-media-icon -translate-x-1/2 -translate-y-1/2 opacity-0',
        'transition-opacity duration-media-base ease-out',
        'group-not-data-loading/thumbnail:group-not-has-[[role=img][data-loading]]/thumbnail:[--media-spinner-animation:none]',
        'group-data-loading/thumbnail:opacity-100 group-has-[[role=img][data-loading]]/thumbnail:opacity-100',
        'drop-shadow-media-icon',
      ],
    },
  },
});

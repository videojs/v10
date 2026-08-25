import { styles } from 'vjsc/styles';

export default styles({
  file: 'sliders.css',
  layer: 'videojs.components',
  rules: {
    root: {
      className: 'media-slider-thumbnail',
      utilities: [
        'group/thumbnail pointer-events-none overflow-hidden',
        'has-[[data-loading]]:aspect-video has-[[data-loading]]:w-(--media-slider-preview-max-width)',
      ],
      variants: {
        default: 'left-1/2 bottom-[calc(100%+2.25rem)] rounded-xl bg-black/90',
        minimal:
          '[left:var(--media-preview-left,var(--media-slider-pointer))] bottom-[calc(100%+2.75rem)] rounded-lg bg-black/90',
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
        'group-has-[[role=img][data-loading]]/thumbnail:opacity-100',
      ],
      variants: {
        default: 'drop-shadow-[0_1px_0_rgb(0_0_0/0.15)]',
        minimal: 'drop-shadow-[0_1px_0_rgb(0_0_0/0.2)]',
      },
    },
  },
});

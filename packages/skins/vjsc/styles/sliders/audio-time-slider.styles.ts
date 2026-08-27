import { styles } from 'vjsc/styles';

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
        'left-(--media-slider-pointer) bottom-[calc(100%+--spacing(10))] rounded-media-control px-2.5 py-1 tabular-nums',
        'text-media',
      ],
      variants: {
        minimal: 'rounded-[--spacing(2)] px-2',
      },
    },
    value: {
      className: 'media-audio-time-slider-value',
      utilities: 'tabular-nums',
    },
  },
});

import { styles } from 'vjsc/styles';

export default styles({
  file: 'audio/time-slider.css',
  rules: {
    root: {
      className: 'audio-time-slider',
      utilities: [],
    },
    thumb: {
      className: 'audio-time-slider-thumb',
      utilities:
        'opacity-0 data-interactive:opacity-100 pointer-fine:group-hover/slider:scale-100 pointer-fine:group-hover/slider:opacity-100',
    },
    previewContent: {
      className: 'audio-time-slider-preview-content',
      utilities: 'bottom-[calc(100%+var(--media-slider-preview-label-offset))] tabular-nums',
      variants: {
        default: 'left-1/2',
        minimal: '[left:var(--media-preview-left,var(--media-slider-pointer))]',
      },
    },
    value: {
      className: 'audio-time-slider-value',
      utilities: 'tabular-nums',
    },
  },
});

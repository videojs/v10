import { styles } from 'vjsc/styles';

import { popupSurface } from '../../styles/recipes/popup';
import { sliderPreviewContent } from '../../styles/recipes/slider';

export default styles({
  file: 'sliders.css',
  rules: {
    root: {
      className: 'media-audio-time-slider',
      utilities: [],
    },
    thumb: {
      className: 'media-audio-time-slider-thumb',
      utilities:
        'opacity-0 data-interactive:opacity-100 pointer-fine:group-hover/slider:scale-100 pointer-fine:group-hover/slider:opacity-100',
    },
    previewContent: {
      className: 'media-audio-time-slider-preview-content',
      utilities: [
        ...sliderPreviewContent,
        ...popupSurface,
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

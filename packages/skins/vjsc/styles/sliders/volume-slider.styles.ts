import { styles } from 'vjsc/styles';

import { sliderThumbTheme } from '../recipes/slider';

export default styles({
  file: 'sliders.css',
  rules: {
    root: {
      className: 'media-volume-slider',
      utilities: [],
    },
    thumb: {
      className: 'media-volume-slider-thumb',
      utilities: ['size-3 scale-100 opacity-100', ...sliderThumbTheme],
    },
  },
});

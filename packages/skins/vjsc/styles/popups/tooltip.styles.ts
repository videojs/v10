import { styles } from 'vjsc/styles';

import { popupPosition, popupSurface, popupTransition, tooltipSafeArea } from '../recipes/popup';

export default styles({
  file: 'popups.css',
  rules: {
    popup: {
      className: 'media-tooltip',
      utilities: [
        ...popupPosition,
        ...popupTransition,
        ...tooltipSafeArea,
        ...popupSurface,
        'whitespace-nowrap text-media',
        'data-open:flex data-open:items-center data-open:gap-1',
      ],
      variants: {
        default: 'rounded-[9999px] px-2.5 py-1',
        minimal: 'rounded-[--spacing(2)] px-2 py-1',
      },
    },
    shortcut: {
      className: 'media-tooltip-shortcut',
      utilities:
        'min-w-[1.5em] rounded-[--spacing(1)] p-[0.1em] text-center text-media-sm [font-family:inherit] font-semibold leading-tight',
      variants: {
        default: 'bg-media-muted',
        minimal: '-me-1 bg-media-muted',
      },
    },
  },
});

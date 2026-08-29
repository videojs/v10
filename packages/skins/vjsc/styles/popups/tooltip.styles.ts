import { styles } from 'vjsc/styles';

import { popupPosition, popupSurface, popupTransition, tooltipSafeArea } from '../recipes/popup';
import { themeRecipe } from '../recipes/theme';

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
        ...themeRecipe(
          'rounded-[9999px] px-2.5 py-1',
          'rounded-[--spacing(2)] px-2 py-1 data-starting-style:filter-none after:hidden'
        ),
      ],
    },
    shortcut: {
      className: 'media-tooltip-shortcut',
      utilities: [
        'min-w-[1.5em] rounded-[--spacing(1)] bg-media-muted p-[0.1em] text-center text-media-sm [font-family:inherit] font-semibold leading-tight',
        ...themeRecipe('', '-me-1'),
      ],
    },
  },
});

import { styles } from 'vjsc/styles';
import { popoverBridge, popup, popupTransition, popupVariants } from '../popup';
import { defaultSurface, minimalSurface } from '../surface';

export default styles({
  file: 'popups.css',
  layer: 'videojs.components',
  rules: {
    popup: {
      className: 'media-volume-popover',
      utilities: [
        ...popup,
        ...popupTransition,
        ...popoverBridge,
        'rounded-media-control px-0 py-3',
        'data-[side=right]:rounded-none data-[side=right]:bg-transparent data-[side=right]:p-0 data-[side=right]:shadow-none data-[side=right]:ring-0 data-[side=right]:backdrop-filter-none data-[side=right]:after:hidden',
        'has-[media-volume-slider[data-hidden]]:hidden',
      ],
      variants: {
        default: [...defaultSurface, ...popupVariants.default],
        minimal: [...minimalSurface, ...popupVariants.minimal],
      },
    },
  },
});

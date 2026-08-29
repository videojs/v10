import { styles } from 'vjsc/styles';

import { popoverSafeArea, popupPosition, popupSurface, popupTransition } from '../recipes/popup';

const minimalAudioPopup = [
  'data-[side=left]:rounded-none data-[side=left]:border-0 data-[side=left]:py-0 data-[side=left]:pe-16 data-[side=left]:ps-2',
  'data-[side=left]:bg-transparent! data-[side=left]:bg-linear-to-l data-[side=left]:from-media-controls data-[side=left]:from-80% data-[side=left]:to-transparent',
  'data-[side=left]:shadow-none! data-[side=left]:ring-0! data-[side=left]:backdrop-filter-none data-[side=left]:after:hidden',
  'data-[side=left]:[--media-popover-side-offset:0rem]',
] as const;

export default styles({
  file: 'popups.css',
  rules: {
    popup: {
      className: 'media-volume-popover',
      utilities: [
        ...popupPosition,
        ...popupTransition,
        ...popoverSafeArea,
        ...popupSurface,
        'rounded-media-control px-0 py-3',
        'data-[side=right]:rounded-none data-[side=right]:bg-transparent data-[side=right]:p-0 data-[side=right]:px-3 data-[side=right]:shadow-none! data-[side=right]:ring-0! data-[side=right]:backdrop-filter-none data-[side=right]:after:hidden',
        'data-[side=right]:[--media-popover-side-offset:0rem]',
      ],
      variants: {
        'minimal-audio': minimalAudioPopup,
        'minimal-live-audio': minimalAudioPopup,
      },
    },
  },
});

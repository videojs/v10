import { styles } from 'vjsc/styles';

export default styles({
  file: 'popups.css',
  rules: {
    popup: {
      className: 'media-audio-volume-popover',
      utilities: [
        'data-[side=left]:rounded-none data-[side=left]:border-0 data-[side=left]:py-0 data-[side=left]:pe-16 data-[side=left]:ps-2',
        'data-[side=left]:bg-transparent! data-[side=left]:bg-linear-to-l data-[side=left]:from-media-controls data-[side=left]:from-80% data-[side=left]:to-transparent',
        'data-[side=left]:shadow-none! data-[side=left]:ring-0! data-[side=left]:backdrop-filter-none data-[side=left]:after:hidden',
        'data-[side=left]:[--media-popover-side-offset:0rem]',
      ],
    },
  },
});

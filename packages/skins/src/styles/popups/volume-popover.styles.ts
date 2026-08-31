import { styles } from 'vjsc/styles';

export default styles({
  file: 'popups.css',
  rules: {
    popup: {
      className: 'media-volume-popover',
      utilities: [
        'rounded-media-control px-0 py-3 [--media-popup-side-offset:var(--media-popover-side-offset)]',
        'data-[side=right]:rounded-none data-[side=right]:bg-transparent data-[side=right]:p-0 data-[side=right]:px-3 data-[side=right]:shadow-none! data-[side=right]:ring-0! data-[side=right]:backdrop-filter-none data-[side=right]:after:hidden',
        'data-[side=right]:[--media-popover-side-offset:0rem]',
      ],
    },
  },
});

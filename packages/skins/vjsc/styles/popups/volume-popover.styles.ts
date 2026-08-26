import { styles } from 'vjsc/styles';

export default styles({
  file: 'popups.css',
  layer: 'videojs.components',
  rules: {
    popup: {
      className: 'media-volume-popover',
      utilities: [
        'rounded-media-control px-0 py-3',
        'data-[side=right]:rounded-none data-[side=right]:bg-transparent data-[side=right]:p-0 data-[side=right]:shadow-none data-[side=right]:ring-0 data-[side=right]:backdrop-filter-none data-[side=right]:after:hidden',
      ],
    },
  },
});

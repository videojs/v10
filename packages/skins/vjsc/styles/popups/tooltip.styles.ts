import { styles } from 'vjsc/styles';

export default styles({
  file: 'popups.css',
  layer: 'videojs.components',
  rules: {
    popup: {
      className: 'media-tooltip',
      utilities: [
        'data-[side=top]:before:h-(--media-tooltip-side-offset) data-[side=bottom]:before:h-(--media-tooltip-side-offset)',
        'data-[side=left]:before:w-(--media-tooltip-side-offset) data-[side=right]:before:w-(--media-tooltip-side-offset)',
        'whitespace-nowrap text-media',
        'data-open:flex data-open:items-center data-open:gap-1',
      ],
      variants: {
        default: 'rounded-[9999px] px-2.5 py-1',
        minimal: 'rounded-[--spacing(2)] px-2 py-1 text-current',
      },
    },
    shortcut: {
      className: 'media-tooltip-shortcut',
      utilities:
        'min-w-[1.5em] rounded-[--spacing(1)] p-[0.1em] text-center text-media-sm [font-family:inherit] font-semibold leading-tight',
      variants: {
        default: 'bg-current/30',
        minimal: '-me-1 bg-current/15',
      },
    },
  },
});

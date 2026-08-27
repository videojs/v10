import { styles } from 'vjsc/styles';

export default styles({
  file: 'controls.css',
  layer: 'videojs.components',
  rules: {
    root: {
      className: 'media-controls-content',
      utilities: [
        'relative z-20 flex items-center gap-2 rounded-[--spacing(3.5)] p-1 [color:var(--media-audio-text-color)]',
        'text-shadow-[0_1px_0_var(--media-shadow-current-color)]',
        '[--media-popover-side-offset:--spacing(3)] [--media-tooltip-side-offset:var(--media-popover-side-offset)]',
        '[--media-popover-boundary-offset:--spacing(3)] [--media-tooltip-boundary-offset:var(--media-popover-boundary-offset)]',
      ],
    },
    start: {
      className: 'media-controls-start',
      utilities: 'flex items-center gap-px',
    },
    end: {
      className: 'media-controls-end',
      utilities: 'flex items-center gap-px',
    },
    spacer: {
      className: 'media-controls-spacer',
      utilities: 'flex-1',
    },
  },
});

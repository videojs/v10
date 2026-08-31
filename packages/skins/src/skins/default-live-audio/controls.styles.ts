import { styles } from 'vjsc/styles';

export default styles({
  file: 'controls.css',
  rules: {
    root: {
      className: 'media-controls-content',
      utilities: [
        'relative z-20 flex items-center rounded-media-control bg-media-controls p-1 text-media-controls-foreground',
        'text-shadow-media',
        '[--media-popover-side-offset:--spacing(3)] [--media-tooltip-side-offset:var(--media-popover-side-offset)]',
        '[--media-popover-boundary-offset:--spacing(2)] [--media-tooltip-boundary-offset:var(--media-popover-boundary-offset)]',
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

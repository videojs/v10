import { styles } from 'vjsc/styles';

export default styles({
  file: 'controls.css',
  rules: {
    root: {
      className: 'media-controls-content',
      utilities: [
        'after:hidden!',
        'relative z-20 flex items-center gap-2 rounded-[--spacing(3.5)] bg-media-controls p-1 text-media-controls-foreground',
        'text-shadow-media',
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

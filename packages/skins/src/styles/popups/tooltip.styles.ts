import { styles } from 'vjsc/styles';

export default styles({
  file: 'popups.css',
  rules: {
    popup: {
      className: 'media-tooltip',
      utilities: [
        'whitespace-nowrap py-1 text-media [--media-popup-side-offset:var(--media-tooltip-side-offset)]',
        'data-open:flex data-open:items-center data-open:gap-1',
      ],
      variants: {
        default: 'rounded-[9999px] px-2.5',
        minimal: 'rounded-[--spacing(2)] px-2',
      },
    },
    shortcut: {
      className: 'media-tooltip-shortcut',
      utilities:
        'min-w-[1.5em] rounded-[--spacing(1)] bg-media-muted p-[0.1em] text-center text-media-sm [font-family:inherit] font-semibold leading-tight',
      variants: { minimal: '-me-1' },
    },
  },
});

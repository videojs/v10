import { styles } from 'vjsc/styles';

export default styles({
  file: 'dialog.css',
  rules: {
    root: {
      className: 'media-dialog-root',
      utilities: '',
    },
    backdrop: {
      className: 'media-dialog-backdrop',
      utilities: [
        'absolute inset-0 z-40 bg-media-scrim/20 opacity-100 backdrop-filter-media-dialog',
        'not-data-open:hidden transition-opacity delay-media-dialog duration-media-dialog ease-out',
        'media-transitioning:opacity-0 data-ending-style:delay-0',
      ],
      variants: {
        default: 'data-ending-style:duration-media-slower',
        minimal: 'data-ending-style:duration-media-instant',
      },
    },
    popup: {
      className: 'media-dialog-popup',
      utilities: [
        'absolute top-1/2 left-1/2 z-50 flex max-h-[calc(100%-0.5rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-3 text-media-popover-foreground outline-hidden not-data-open:hidden',
        'text-shadow-media-dialog transition-[opacity,scale] delay-media-dialog duration-media-dialog ease-out',
        'media-transitioning:scale-media-hidden-popup media-transitioning:opacity-0 data-ending-style:delay-0',
      ],
      variants: {
        default: [
          'bg-media-popover surface-media after:surface-media-inset',
          'w-[calc(100%-1.5rem)] max-w-72 rounded-[--spacing(7)] p-3',
          'data-ending-style:duration-media-slower',
        ],
        minimal: ['w-full max-w-64 p-4', 'data-ending-style:duration-media-instant'],
      },
    },
    content: {
      className: 'media-dialog-content',
      utilities: 'flex min-h-0 flex-col gap-2 overflow-y-auto',
      variants: { default: 'px-2 pt-2 pb-1.5', minimal: 'py-1.5' },
    },
    title: {
      className: 'media-dialog-title',
      utilities: 'm-0 text-media-lg font-semibold leading-tight',
    },
    description: {
      className: 'media-dialog-description',
      utilities: 'm-0 opacity-70 wrap-anywhere',
    },
    actions: {
      className: 'media-dialog-actions',
      utilities: 'flex shrink-0 gap-2',
    },
    close: {
      className: 'media-dialog-close',
      utilities: 'h-media-control w-full flex-1 bg-media-primary! px-4 py-2 font-medium text-media-primary-foreground!',
    },
  },
});

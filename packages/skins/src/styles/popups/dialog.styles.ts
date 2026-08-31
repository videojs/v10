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
        'absolute inset-0 z-40 bg-black/20 backdrop-blur-lg opacity-100 backdrop-saturate-150',
        'not-data-open:hidden transition-opacity delay-100 ease-out motion-reduce:duration-50',
        'data-starting-style:opacity-0 data-ending-style:opacity-0 data-ending-style:delay-0',
        'motion-reduce:delay-0 motion-reduce:data-ending-style:duration-50',
      ],
      variants: {
        default: 'duration-350 data-ending-style:duration-250',
        minimal: 'backdrop-saturate-120 duration-150 data-ending-style:duration-50',
      },
    },
    popup: {
      className: 'media-dialog-popup',
      utilities: [
        'absolute top-1/2 left-1/2 z-50 flex max-h-[calc(100%-0.5rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-3 text-white outline-hidden not-data-open:hidden',
        'transition-[opacity,scale] delay-100 ease-out motion-reduce:duration-50',
        'data-starting-style:scale-95 data-starting-style:opacity-0',
        'data-ending-style:scale-95 data-ending-style:opacity-0 data-ending-style:delay-0',
        'motion-reduce:delay-0 motion-reduce:data-ending-style:duration-50',
      ],
      variants: {
        default: [
          'bg-media-popover text-media-popover-foreground backdrop-blur-lg backdrop-saturate-150',
          'ring-1 ring-media-border shadow-media-sm',
          'after:pointer-events-none after:absolute after:inset-0 after:z-10 after:rounded-[inherit]',
          'after:shadow-media-surface-inset',
          'opaque:bg-media-background opaque:backdrop-filter-none',
          'opaque:after:shadow-media-surface-inset-opaque',
          'forced-colors:bg-[Canvas] forced-colors:text-[CanvasText] forced-colors:ring-[CanvasText]',
          'forced-colors:after:shadow-media-surface-inset-forced',
          'w-[calc(100%-1.5rem)] max-w-72 rounded-[1.75rem] p-3',
          'text-shadow-[0_1px_0_rgb(0_0_0/0.25)] duration-350 data-ending-style:duration-250',
        ],
        minimal: [
          'w-full max-w-64 p-4',
          'text-shadow-[0_1px_0_rgb(0_0_0/0.5)] duration-150 data-ending-style:duration-50',
        ],
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
      utilities: 'h-media-control w-full flex-1 bg-media-accent! px-4 py-2 font-medium text-media-accent-text!',
    },
  },
});

import { styles } from 'vjsc/styles';

export default styles({
  file: 'dialog.css',
  rules: {
    root: {
      className: 'media-audio-dialog-root',
      utilities: '',
    },
    backdrop: {
      className: 'media-audio-dialog-backdrop',
      utilities: 'hidden',
    },
    popup: {
      className: 'media-audio-dialog-popup',
      utilities: [
        'absolute inset-0 z-50 flex h-full max-h-none w-full translate-none flex-row items-center rounded-[99px] py-0 pe-1 outline-hidden not-data-open:hidden',
        'bg-media-background text-media-controls-foreground backdrop-blur-lg backdrop-saturate-150',
        'transition-[opacity,filter] duration-250 ease-out',
        'data-starting-style:blur-xs data-starting-style:opacity-0',
        'data-ending-style:blur-xs data-ending-style:opacity-0',
      ],
      variants: {
        default: 'gap-3 px-5',
        minimal: [
          'gap-4 px-3 backdrop-filter-none transition-[opacity,filter,scale]',
          '[&:is([data-starting-style],[data-ending-style])]:[scale:.95]',
        ],
      },
    },
    content: {
      className: 'media-audio-dialog-content',
      utilities: 'flex min-h-0 flex-1 flex-row items-center gap-2 overflow-visible',
    },
    title: {
      className: 'media-audio-dialog-title',
      utilities: 'm-0 text-media-lg font-semibold leading-tight',
    },
    description: {
      className: 'media-audio-dialog-description',
      utilities: 'm-0 opacity-70 wrap-anywhere',
    },
    actions: {
      className: 'media-audio-dialog-actions',
      utilities: 'flex shrink-0 gap-2',
    },
    close: {
      className: 'media-audio-dialog-close',
      utilities: 'h-media-control w-auto flex-none bg-media-accent px-3 font-medium text-media-accent-text',
    },
  },
});

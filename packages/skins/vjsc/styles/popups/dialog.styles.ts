import { styles } from 'vjsc/styles';

export default styles({
  file: 'dialog.css',
  layer: 'videojs.components',
  rules: {
    root: {
      className: 'media-dialog-root',
      utilities: 'group/dialog absolute inset-0 z-40 hidden items-center justify-center outline-none data-[open]:flex',
    },
    backdrop: {
      className: 'media-dialog-backdrop',
      utilities: [
        'absolute inset-0 z-40 bg-black/20 backdrop-blur-lg opacity-100 backdrop-saturate-150',
        'not-data-open:hidden transition-[opacity,backdrop-filter] delay-100 ease-out motion-reduce:duration-50',
        'data-starting-style:opacity-0 data-ending-style:opacity-0 data-ending-style:delay-0',
        'motion-reduce:delay-0',
      ],
      variants: {
        default: 'duration-350',
        minimal: 'backdrop-saturate-120 duration-150',
      },
    },
    popup: {
      className: 'media-dialog-popup',
      utilities: [
        'absolute top-1/2 left-1/2 z-50 flex -translate-x-1/2 -translate-y-1/2 flex-col gap-3 outline-none',
        'transition-[opacity,scale] delay-100 ease-out motion-reduce:duration-50',
        'data-starting-style:scale-95 data-starting-style:opacity-0',
        'data-ending-style:scale-95 data-ending-style:opacity-0 data-ending-style:delay-0',
        'group-data-starting-style/dialog:scale-95 group-data-starting-style/dialog:opacity-0',
        'group-data-ending-style/dialog:scale-95 group-data-ending-style/dialog:opacity-0 group-data-ending-style/dialog:delay-0',
        'motion-reduce:delay-0',
      ],
      variants: {
        default: [
          'w-[calc(100%-1.5rem)] max-w-72 rounded-[1.75rem] p-3 text-white',
          'text-shadow-[0_1px_0_rgb(0_0_0/0.25)] duration-350',
        ],
        minimal: ['w-full max-w-64 p-4 text-white', 'text-shadow-[0_1px_0_rgb(0_0_0/0.5)] duration-150'],
      },
    },
    content: {
      className: 'media-dialog-content',
      utilities: 'flex flex-col gap-2',
      variants: {
        default: 'px-2 pt-2 pb-1.5',
        minimal: 'py-1.5',
      },
    },
    title: {
      className: 'media-dialog-title',
      utilities: 'my-[0.83em] text-media-lg font-semibold leading-tight',
    },
    description: {
      className: 'media-dialog-description',
      utilities: 'my-[1em] opacity-70 wrap-anywhere',
    },
    actions: {
      className: 'media-dialog-actions',
      utilities: 'flex gap-2',
    },
    close: {
      className: 'media-dialog-close',
      utilities: 'w-full flex-1 bg-media-accent! px-4 py-2 font-medium text-media-accent-text!',
      variants: {
        default: 'h-9',
        minimal: 'h-9.5',
      },
    },
  },
});

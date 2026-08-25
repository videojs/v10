import { styles } from 'vjsc/styles';

import { defaultSurface } from './popup.styles';

export default styles({
  file: 'dialog.css',
  layer: 'videojs.components',
  rules: {
    root: {
      className: 'media-error-dialog',
      utilities: [
        'peer/error z-20 flex flex-col gap-3 outline-none',
        'not-data-open:hidden transition-[opacity,scale,transform] delay-100 ease-out motion-reduce:delay-0 motion-reduce:duration-50',
        'data-starting-style:scale-50 data-starting-style:opacity-0',
        'data-ending-style:scale-50 data-ending-style:opacity-0 data-ending-style:delay-0',
        'motion-reduce:delay-0',
      ],
      variants: {
        default: [
          ...defaultSurface,
          'absolute top-1/2 left-1/2 w-[calc(100%-1.5rem)] max-w-72 -translate-x-1/2 -translate-y-1/2 rounded-[1.75rem] p-3 text-white',
          'duration-350',
        ],
        minimal: [
          'absolute inset-0 h-full w-full items-center justify-center p-4 text-white',
          'duration-150',
          'pointer-events-none [&>*]:pointer-events-auto',
        ],
      },
    },
    title: {
      className: 'media-error-dialog-title',
      utilities: 'font-semibold leading-tight',
      variants: {
        default: 'px-2 pt-2 text-media',
        minimal: 'w-full max-w-64 pt-1.5 text-[--spacing(3.75)]',
      },
    },
    description: {
      className: 'media-error-dialog-description',
      utilities: 'pb-1.5 opacity-70 wrap-anywhere',
      variants: { default: 'px-2', minimal: 'w-full max-w-64' },
    },
    close: {
      className: 'media-error-dialog-close',
      utilities: 'h-9 w-full bg-media-accent px-4 font-medium text-media-accent-text',
      variants: { default: '', minimal: 'max-w-64' },
    },
  },
});

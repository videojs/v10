import { defineStyles, variants } from '../define';
import { surface } from './popup.tailwind';

export default defineStyles({
  role: 'dialog',
  styles: {
    errorDialog: variants({
      base: [
        'peer/error z-20 flex flex-col gap-3 outline-none',
        'not-data-open:hidden transition-[opacity,scale,transform] delay-(--media-error-dialog-transition-delay) ease-media-out',
        'data-starting-style:scale-50 data-starting-style:opacity-0',
        'data-ending-style:scale-50 data-ending-style:opacity-0 data-ending-style:delay-0',
        'motion-reduce:delay-0',
      ],
      variants: {
        default: [
          ...surface,
          'absolute top-1/2 left-1/2 w-[calc(100%-1.5rem)] max-w-72 -translate-x-1/2 -translate-y-1/2 rounded-[1.75rem] p-3 text-white',
          'duration-(--media-error-dialog-transition-duration)',
        ],
        minimal: [
          'absolute inset-0 h-full w-full items-center justify-center p-4 text-white',
          'duration-(--media-error-dialog-transition-duration)',
          'pointer-events-none [&>*]:pointer-events-auto',
        ],
      },
    }),
    errorDialogTitle: variants({
      base: 'font-semibold leading-tight',
      variants: {
        default: 'px-2 pt-2 text-media',
        minimal: 'w-full max-w-64 pt-1.5 text-[calc(var(--media-font-size)*1.15)]',
      },
    }),
    errorDialogDescription: variants({
      base: 'pb-1.5 opacity-70 wrap-anywhere',
      variants: { default: 'px-2', minimal: 'w-full max-w-64' },
    }),
    errorDialogClose: variants({
      base: 'h-9 w-full bg-media-accent px-4 font-medium text-media-accent-text',
      variants: { default: '', minimal: 'max-w-64' },
    }),
  },
});

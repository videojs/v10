import { defineStyles } from '../define';

export default defineStyles({
  role: 'dialog',
  styles: {
    errorDialog: [
      'peer/error absolute top-1/2 left-1/2 z-20 flex w-[calc(100%-1.5rem)] max-w-72 -translate-x-1/2 -translate-y-1/2 flex-col gap-3 rounded-[1.75rem] p-3 text-white outline-none',
      'not-data-open:hidden transition-[opacity,scale,transform] duration-350 delay-100 ease-out',
      'data-starting-style:scale-50 data-starting-style:opacity-0',
      'data-ending-style:scale-50 data-ending-style:opacity-0 data-ending-style:delay-0',
      'motion-reduce:duration-50 motion-reduce:delay-0',
    ],
    errorDialogMinimal: [
      'inset-0 top-0 left-0 h-full w-full max-w-none translate-x-0 translate-y-0 items-center justify-center rounded-none bg-transparent p-4 shadow-none [backdrop-filter:none] after:hidden',
      'duration-(--error-dialog-transition-duration)',
      'pointer-events-none [&>*]:pointer-events-auto',
    ],
    errorDialogTitle: 'px-2 pt-2 text-media font-semibold leading-tight',
    errorDialogTitleMinimal: 'w-full max-w-64 px-0 pt-1.5 text-[calc(var(--media-font-size)*1.15)]',
    errorDialogDescription: 'px-2 pb-1.5 opacity-70 wrap-anywhere',
    errorDialogDescriptionMinimal: 'w-full max-w-64 px-0 pb-1.5',
    errorDialogClose: 'h-9 w-full bg-white px-4 font-medium text-black',
    errorDialogCloseMinimal: 'max-w-64',
  },
});

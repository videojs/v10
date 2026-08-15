import { defineStyles } from '../define';

export default defineStyles({
  role: 'dialog',
  styles: {
    errorDialog: [
      'absolute top-1/2 left-1/2 z-20 flex w-[calc(100%-1.5rem)] max-w-72 -translate-x-1/2 -translate-y-1/2 flex-col gap-3 rounded-[1.75rem] p-3 text-white outline-none',
      'not-data-open:hidden transition-[opacity,scale,transform] duration-350 delay-100 ease-out',
      'data-starting-style:scale-50 data-starting-style:opacity-0',
      'data-ending-style:scale-50 data-ending-style:opacity-0 data-ending-style:delay-0',
      'motion-reduce:duration-50 motion-reduce:delay-0',
    ],
    errorDialogTitle: 'px-2 pt-2 text-media font-semibold leading-tight',
    errorDialogDescription: 'px-2 pb-1.5 opacity-70 wrap-anywhere',
    errorDialogClose: 'h-9 w-full bg-white px-4 font-medium text-black',
  },
});

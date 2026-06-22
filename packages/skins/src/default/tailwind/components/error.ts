import { cn } from '@videojs/utils/style';

export const error = {
  root: 'peer/error group/error hidden data-[open]:flex absolute inset-0 z-20 items-center justify-center outline-none',
  popup: cn(
    'peer/error group/error hidden data-[open]:flex absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 outline-none',
    'flex-col gap-3 max-w-72 p-5 rounded-[1.75rem] text-white',
    // Animation
    'transition-[opacity,scale,transform]',
    'duration-(--media-error-dialog-transition-duration)',
    'delay-(--media-error-dialog-transition-delay)',
    'ease-(--media-error-dialog-transition-timing-function)',
    'data-starting-style:opacity-0 data-starting-style:scale-50',
    'data-ending-style:opacity-0 data-ending-style:scale-50',
    'data-ending-style:delay-0'
  ),
  dialog: cn(
    'flex flex-col gap-3 max-w-72 p-3 rounded-[1.75rem] text-white',
    // Animation
    'transition-[opacity,scale,transform]',
    'duration-(--media-error-dialog-transition-duration)',
    'delay-(--media-error-dialog-transition-delay)',
    'ease-(--media-error-dialog-transition-timing-function)',
    'group-data-starting-style/error:opacity-0 group-data-starting-style/error:scale-50',
    'group-data-ending-style/error:opacity-0 group-data-ending-style/error:scale-50',
    'group-data-ending-style/error:delay-0'
  ),
  content: 'flex flex-col gap-2 px-2 pt-2 pb-1.5',
  title: 'font-semibold leading-tight',
  description: 'opacity-70 wrap-anywhere',
  actions: 'flex gap-2 *:flex-1',
  close: 'w-full',
};

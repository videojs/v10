import { cn } from '@videojs/utils/style';

export const error = {
  root: 'group/error hidden data-[open]:flex absolute inset-0 z-20 items-center justify-center outline-none',
  backdrop: cn(
    'absolute inset-0 z-10 pointer-events-none bg-black/20 backdrop-blur-lg backdrop-saturate-150 opacity-100 not-data-open:hidden',
    'transition-opacity',
    'duration-(--media-error-dialog-transition-duration)',
    'delay-(--media-error-dialog-transition-delay)',
    'ease-(--media-error-dialog-transition-timing-function)',
    'data-starting-style:opacity-0 data-ending-style:opacity-0 data-ending-style:delay-0'
  ),
  popup: cn(
    'flex absolute top-1/2 left-1/2 z-20 max-w-72',
    '-translate-x-1/2 -translate-y-1/2 flex-col gap-3 rounded-[--spacing(7)] p-3 text-white outline-none',
    'transition-[opacity,scale]',
    'duration-(--media-error-dialog-transition-duration)',
    'delay-(--media-error-dialog-transition-delay)',
    'ease-(--media-error-dialog-transition-timing-function)',
    'data-starting-style:scale-95 data-starting-style:opacity-0',
    'data-ending-style:scale-95 data-ending-style:opacity-0 data-ending-style:delay-0',
    'group-data-starting-style/error:scale-95 group-data-starting-style/error:opacity-0',
    'group-data-ending-style/error:scale-95 group-data-ending-style/error:opacity-0 group-data-ending-style/error:delay-0',
    'motion-reduce:scale-100 motion-reduce:transition-opacity'
  ),
  content: 'flex flex-col gap-2 px-2 pt-2 pb-1.5',
  title: 'font-semibold leading-tight',
  description: 'opacity-70 wrap-anywhere',
  actions: 'flex gap-2 *:flex-1',
};

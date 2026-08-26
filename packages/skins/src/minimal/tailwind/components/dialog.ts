import { cn } from '@videojs/utils/style';

export const dialog = {
  root: 'group/dialog hidden data-[open]:flex absolute inset-0 z-20 items-center justify-center outline-none',
  backdrop: cn(
    'absolute inset-0 z-10 pointer-events-none bg-black/20 backdrop-blur-lg backdrop-saturate-120 opacity-100 not-data-open:hidden',
    'transition-opacity',
    'duration-(--media-dialog-transition-duration)',
    'delay-(--media-dialog-transition-delay)',
    'ease-(--media-dialog-transition-timing-function)',
    'data-starting-style:opacity-0 data-ending-style:opacity-0 data-ending-style:delay-0'
  ),
  popup: cn(
    'flex absolute top-1/2 left-1/2 z-20 max-w-64',
    '-translate-x-1/2 -translate-y-1/2 flex-col gap-3 p-4 text-white outline-none',
    'text-shadow-2xs text-shadow-black/50',
    'transition-[opacity,scale]',
    'duration-(--media-dialog-transition-duration)',
    'delay-(--media-dialog-transition-delay)',
    'ease-(--media-dialog-transition-timing-function)',
    'data-starting-style:scale-95 data-starting-style:opacity-0',
    'data-ending-style:scale-95 data-ending-style:opacity-0 data-ending-style:delay-0',
    'group-data-starting-style/dialog:scale-95 group-data-starting-style/dialog:opacity-0',
    'group-data-ending-style/dialog:scale-95 group-data-ending-style/dialog:opacity-0 group-data-ending-style/dialog:delay-0',
    'motion-reduce:scale-100 motion-reduce:transition-opacity'
  ),
  content: 'flex flex-col gap-2 py-1.5',
  title: 'font-semibold leading-tight',
  description: 'opacity-70 wrap-anywhere',
  actions: 'flex gap-2 *:flex-1',
};

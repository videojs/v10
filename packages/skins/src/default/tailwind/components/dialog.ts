import { cn } from '@videojs/utils/style';

export const dialog = {
  root: '',
  backdrop: cn(
    'absolute inset-0 z-10 pointer-events-none bg-black/20 backdrop-blur-lg backdrop-saturate-150 opacity-100 not-data-open:hidden',
    'transition-opacity',
    'duration-(--media-dialog-transition-duration)',
    'delay-(--media-dialog-transition-delay)',
    'ease-(--media-dialog-transition-timing-function)',
    'data-starting-style:opacity-0 data-ending-style:opacity-0 data-ending-style:delay-0'
  ),
  popup: cn(
    'flex absolute top-1/2 left-1/2 z-20 max-w-72 max-h-[calc(100%-0.5rem)] not-data-open:hidden',
    '-translate-x-1/2 -translate-y-1/2 flex-col gap-3 rounded-[--spacing(7)] p-3 text-white outline-none',
    'transition-[opacity,scale]',
    'duration-(--media-dialog-transition-duration)',
    'delay-(--media-dialog-transition-delay)',
    'ease-(--media-dialog-transition-timing-function)',
    'data-starting-style:scale-95 data-starting-style:opacity-0',
    'data-ending-style:scale-95 data-ending-style:opacity-0 data-ending-style:delay-0',
    'motion-reduce:scale-100 motion-reduce:transition-opacity'
  ),
  content: 'flex min-h-0 flex-col gap-2 overflow-y-auto px-2 pt-2 pb-1.5',
  // Reset native h2/p margins so the dialog gap controls copy spacing.
  title: 'm-0 font-semibold leading-tight',
  description: 'm-0 opacity-70 wrap-anywhere',
  actions: 'flex shrink-0 gap-2 *:flex-1',
};

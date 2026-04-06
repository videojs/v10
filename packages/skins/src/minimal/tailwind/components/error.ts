import { cn } from '@videojs/utils/style';

export const error = {
  root: 'peer/error group/error hidden data-[open]:flex absolute inset-0 z-20 items-center justify-center outline-none',
  dialog: cn(
    'flex flex-col gap-3 max-w-64 p-4 text-white',
    'text-shadow-2xs text-shadow-black/50',
    // Animation
    'transition-[opacity,scale,transform]',
    'duration-(--media-error-dialog-transition-duration)',
    'delay-(--media-error-dialog-transition-delay)',
    'ease-(--media-error-dialog-transition-timing-function)',
    'group-data-starting-style/error:opacity-0 group-data-starting-style/error:scale-50',
    'group-data-ending-style/error:opacity-0 group-data-ending-style/error:scale-50',
    'group-data-ending-style/error:delay-0'
  ),
  content: 'flex flex-col gap-2 py-1.5',
  title: 'font-semibold leading-tight',
  description: 'opacity-70 wrap-anywhere',
  actions: 'flex gap-2 *:flex-1',
};

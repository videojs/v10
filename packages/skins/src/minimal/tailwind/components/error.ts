import { cn } from '@videojs/utils/style';

export const error = {
  root: 'peer/error group/error flex absolute inset-0 z-20 items-center justify-center outline-none',
  dialog: cn(
    'flex flex-col gap-3 max-w-64 p-4 text-white',
    'text-shadow-2xs text-shadow-black/50',
    // Animation
    'transition-[opacity,scale,transform] duration-500 delay-100',
    'ease-[linear(0,0.034_1.5%,0.763_9.7%,1.066_13.9%,1.198_19.9%,1.184_21.8%,0.963_37.5%,0.997_50.9%,1)]',
    'group-data-starting-style/error:opacity-0 group-data-starting-style/error:scale-50',
    'group-data-ending-style/error:opacity-0 group-data-ending-style/error:scale-50',
    // Simple, fast transition for reduced motion users
    'motion-reduce:duration-100 motion-reduce:ease-out motion-reduce:delay-0'
  ),
  content: 'flex flex-col gap-2 py-1.5',
  title: 'font-semibold leading-tight',
  description: 'opacity-70 wrap-anywhere',
  actions: 'flex gap-2 *:flex-1',
};

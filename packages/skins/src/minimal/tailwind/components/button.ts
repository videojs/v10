import { cn } from '@videojs/utils/style';

export const button = {
  base: cn(
    'items-center justify-center shrink-0 border-none cursor-pointer select-none text-center',
    'outline-2 outline-transparent -outline-offset-2',
    'font-medium text-shadow-inherit',
    'transition-[background-color,color,outline-offset,scale] duration-150 ease-out',
    'focus-visible:outline-current focus-visible:outline-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-50 disabled:grayscale',
    'data-[availability=unavailable]:hidden'
  ),
  icon: cn(
    'grid w-[2.375rem] aspect-square bg-transparent rounded-lg',
    'text-inherit',
    'hover:text-current/80 hover:no-underline',
    'focus-visible:text-current/80',
    'aria-expanded:text-current/80',
    'active:scale-90'
  ),
  default: cn('flex py-2 px-4 bg-white rounded-lg', 'text-black'),
};

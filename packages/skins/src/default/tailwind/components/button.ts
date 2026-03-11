import { cn } from '@videojs/utils/style';

export const button = {
  base: cn(
    'items-center justify-center shrink-0 border-none cursor-pointer select-none text-center',
    'font-medium',
    'outline-2 outline-transparent -outline-offset-2',
    'transition-[background-color,color,outline-offset,scale] duration-150 ease-out',
    'disabled:cursor-not-allowed disabled:opacity-50 disabled:grayscale',
    'focus-visible:outline-blue-500 focus-visible:outline-offset-2',
    'data-[availability=unavailable]:hidden'
  ),
  icon: cn(
    'grid w-[2.125rem] aspect-square bg-transparent rounded-full',
    'text-inherit text-shadow-inherit',
    'hover:bg-current/10 hover:no-underline',
    'focus-visible:bg-current/10',
    'aria-expanded:bg-current/10',
    'active:scale-90'
  ),
  default: cn('flex py-2 px-4 bg-white rounded-full', 'text-black'),
};

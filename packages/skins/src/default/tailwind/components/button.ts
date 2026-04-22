import { cn } from '@videojs/utils/style';

export const button = {
  base: cn(
    'flex items-center justify-center shrink-0 border-none cursor-pointer select-none text-center touch-manipulation',
    'py-2 px-4 rounded-full',
    'outline-2 outline-transparent -outline-offset-2',
    'transition-[background-color,outline-offset,scale] will-change-[scale] duration-150 ease-out',
    'active:scale-[0.98]',
    'disabled:cursor-not-allowed disabled:opacity-50 disabled:grayscale',
    'focus-visible:outline-current focus-visible:outline-offset-2',
    'data-[availability=unavailable]:hidden',
    'data-[availability=unsupported]:hidden'
  ),
  primary: 'bg-white text-black font-medium text-shadow-none',
  subtle: cn(
    'bg-transparent text-inherit text-shadow-inherit',
    'hover:bg-current/10 hover:no-underline',
    'focus-visible:bg-current/10',
    'aria-expanded:bg-current/10'
  ),
  icon: cn('grid w-9 aspect-square p-0', 'active:scale-90'),
};

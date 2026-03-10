import { cn } from '@videojs/utils/style';

export const slider = {
  root: cn(
    'group/slider relative flex flex-1 items-center justify-center rounded-full outline-none',
    // Horizontal
    'data-[orientation=horizontal]:min-w-20 data-[orientation=horizontal]:w-full data-[orientation=horizontal]:h-5',
    // Vertical
    'data-[orientation=vertical]:w-5 data-[orientation=vertical]:h-[4.5rem]'
  ),
  track: cn(
    'relative isolate overflow-hidden bg-current/20 rounded-[inherit] select-none',
    // Horizontal
    'data-[orientation=horizontal]:w-full data-[orientation=horizontal]:h-0.75',
    // Vertical
    'data-[orientation=vertical]:w-0.75 data-[orientation=vertical]:h-full'
  ),
  fill: {
    base: 'absolute rounded-[inherit] pointer-events-none',
    fill: cn(
      'bg-current',
      // Horizontal
      'data-[orientation=horizontal]:inset-y-0 data-[orientation=horizontal]:left-0',
      'data-[orientation=horizontal]:w-(--media-slider-fill,0)',
      // Vertical
      'data-[orientation=vertical]:inset-x-0 data-[orientation=vertical]:bottom-0',
      'data-[orientation=vertical]:h-(--media-slider-fill,0)'
    ),
    buffer: cn(
      'bg-current/20 duration-250 ease-out',
      // Horizontal
      'data-[orientation=horizontal]:inset-y-0 data-[orientation=horizontal]:left-0',
      'data-[orientation=horizontal]:transition-[width] data-[orientation=horizontal]:w-(--media-slider-buffer,0)',
      // Vertical
      'data-[orientation=vertical]:inset-x-0 data-[orientation=vertical]:bottom-0',
      'data-[orientation=vertical]:transition-[height] data-[orientation=vertical]:h-(--media-slider-buffer)'
    ),
  },
  thumb: {
    base: cn(
      'z-10 absolute size-3 -translate-x-1/2 -translate-y-1/2',
      'bg-current rounded-full',
      'shadow-[0_0_0_1px_var(--media-controls-current-shadow-color-subtle,oklch(0_0_0/0.1)),0_1px_3px_0_oklch(0_0_0/0.15),0_1px_2px_-1px_oklch(0_0_0/0.15)]',
      'transition-[opacity,scale,outline-offset] duration-150 ease-out select-none',
      'outline-2 outline-transparent -outline-offset-2',
      'focus-visible:outline-current focus-visible:outline-offset-2',
      // Horizontal
      'data-[orientation=horizontal]:top-1/2 data-[orientation=horizontal]:left-(--media-slider-fill,0)',
      // Vertical
      'data-[orientation=vertical]:left-1/2 data-[orientation=vertical]:top-[calc(100%-var(--media-slider-fill,0))]'
    ),
    interactive: cn(
      'opacity-0 scale-70 origin-center',
      'group-hover/slider:opacity-100 group-hover/slider:scale-100',
      'group-focus-within/slider:opacity-100 group-focus-within/slider:scale-100'
    ),
  },
};

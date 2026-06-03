import { cn } from '@videojs/utils/style';

export const slider = {
  root: cn(
    'group/slider relative flex flex-1 items-center justify-center rounded-full outline-none cursor-pointer',
    // Horizontal
    'data-[orientation=horizontal]:min-w-20 data-[orientation=horizontal]:w-full data-[orientation=horizontal]:h-8',
    // Vertical
    'data-[orientation=vertical]:w-8 data-[orientation=vertical]:h-20'
  ),
  track: cn(
    'relative isolate overflow-hidden rounded-[inherit] select-none',
    // Horizontal
    'data-[orientation=horizontal]:w-full data-[orientation=horizontal]:h-1',
    // Vertical
    'data-[orientation=vertical]:w-1 data-[orientation=vertical]:h-full'
  ),
  fill: {
    base: 'absolute rounded-[inherit] pointer-events-none',
    fill: cn(
      'bg-current',
      // Horizontal
      'data-[orientation=horizontal]:inset-y-0 data-[orientation=horizontal]:left-0',
      'data-[orientation=horizontal]:w-(--media-slider-fill)',
      // Vertical
      'data-[orientation=vertical]:inset-x-0 data-[orientation=vertical]:bottom-0',
      'data-[orientation=vertical]:h-(--media-slider-fill)'
    ),
    buffer: cn(
      'bg-current/20 duration-250 ease-out',
      // Horizontal
      'data-[orientation=horizontal]:inset-y-0 data-[orientation=horizontal]:left-0',
      'data-[orientation=horizontal]:transition-[width] data-[orientation=horizontal]:w-(--media-slider-buffer)',
      // Vertical
      'data-[orientation=vertical]:inset-x-0 data-[orientation=vertical]:bottom-0',
      'data-[orientation=vertical]:transition-[height] data-[orientation=vertical]:h-(--media-slider-buffer)'
    ),
  },
  thumb: {
    base: cn(
      'z-10 absolute -translate-x-1/2 -translate-y-1/2',
      'bg-current rounded-full',
      'shadow-[0_0_0_1px_var(--media-current-shadow-color,oklch(0_0_0/0.1)),0_1px_3px_0_oklch(0_0_0/0.35),0_1px_2px_-1px_oklch(0_0_0/0.35)]',
      'transition-[opacity,height,width,outline-offset] duration-150 ease-out select-none',
      'outline-4 outline-transparent -outline-offset-4',
      'hover:outline-current/15 hover:outline-offset-0',
      'focus-visible:outline-current/15 focus-visible:outline-offset-0',
      // Horizontal
      'data-[orientation=horizontal]:top-1/2 data-[orientation=horizontal]:left-(--media-slider-fill)',
      // Vertical
      'data-[orientation=vertical]:left-1/2 data-[orientation=vertical]:top-[calc(100%-var(--media-slider-fill))]'
    ),
    persistent: 'size-3',
    interactive: cn(
      'size-2.5',
      'opacity-0 focus-visible:opacity-100 group-hover/slider:opacity-100',
      'group-active/slider:size-3'
    ),
  },
  preview: cn(
    'group/preview',
    'before:block before:min-w-1 before:h-1 before:bg-current before:rounded-full before:opacity-0 before:scale-50',
    'before:shadow-[0_0_0_1px_var(--media-current-shadow-color,oklch(0_0_0/0.15)),0_1px_2px_0_oklch(0_0_0/0.35)]',
    'before:transition-[opacity,scale] before:duration-200 before:ease-out',
    'data-pointing:not-data-dragging:before:opacity-100 data-pointing:not-data-dragging:before:scale-100',
    'peer-has-[[role=img]:not([data-hidden])]/thumbnail:*:hidden'
  ),
  value: cn(
    'absolute bottom-9 tabular-nums',
    '-translate-x-1/2 translate-y-2 scale-50 opacity-0 blur-lg',
    'text-shadow-2xs text-shadow-(color:--media-current-shadow-color)',
    'transition-[filter,opacity,scale,translate] duration-200 ease-out',
    'group-data-pointing/preview:translate-y-0 group-data-pointing/preview:scale-100',
    'group-data-pointing/preview:opacity-100 group-data-pointing/preview:blur-none'
  ),
};

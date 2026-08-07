import { cn } from '@videojs/utils/style';

const previewContent = cn(
  'absolute [left:var(--preview-left,var(--media-slider-pointer))] max-w-(--max-width)',
  '-translate-x-1/2 translate-y-2 scale-80 opacity-0 blur-lg origin-bottom',
  'transition-[scale,opacity,filter] duration-150 ease-out',
  'group-data-pointing/preview:scale-100 group-data-pointing/preview:opacity-100',
  'group-data-pointing/preview:blur-none'
);

export const slider = {
  root: cn(
    'group/slider relative flex flex-1 items-center justify-center outline-none cursor-pointer',
    // Horizontal
    'data-[orientation=horizontal]:min-w-20 data-[orientation=horizontal]:w-(--slider-width,100%) data-[orientation=horizontal]:h-(--slider-height,--spacing(8))',
    // Vertical
    'data-[orientation=vertical]:flex-col data-[orientation=vertical]:w-(--slider-width,--spacing(8)) data-[orientation=vertical]:h-(--slider-height,--spacing(20))'
  ),
  track: cn(
    'group/track relative grid flex-1 bg-current/20 rounded-full',
    '[clip-path:var(--media-slider-clip-path,none)]',
    '*:[grid-area:1/1] *:min-h-0 *:pointer-events-none *:rounded-[inherit]',
    // Horizontal
    'data-[orientation=horizontal]:h-0.75 data-[orientation=horizontal]:has-[[data-segments]]:h-[--spacing(1.375)]',
    // Vertical
    'data-[orientation=vertical]:items-end data-[orientation=vertical]:w-0.75 data-[orientation=vertical]:h-full',
    'data-[orientation=vertical]:has-[[data-segments]]:w-[--spacing(1.375)]'
  ),
  fill: {
    base: cn(
      'rounded-[inherit] pointer-events-none motion-safe:duration-200 motion-safe:ease-out',
      // Fix clipped radius issue (fills have larger height but are cut off, so the radius looks weird so we clip a new radius)
      'group-has-[[data-segments]]/track:data-[orientation=horizontal]:[clip-path:inset(--spacing(0.3125)_0_round_--spacing(0.6875))]',
      // Fix clipped radius issue (fills have larger height but are cut off, so the radius looks weird so we clip a new radius)
      'group-has-[[data-segments]]/track:data-[orientation=vertical]:[clip-path:inset(0_--spacing(0.3125)_round_--spacing(0.6875))]',
      /**
       * This is not ideal but we expand the clip whenever any segment is highlighted.
       * The reason we do this is so if the end of the fill is within the highlighted segment, it's full height.
       * Pixel-peepers like myself may notice (and be annoyed by) the radius mismatch when it's not inside the highlighted segment though.
       */
      'group-has-[[data-slot=slider-segment][data-highlighted]]/track:data-orientation:[clip-path:inset(0_0_round_--spacing(0.6875))]'
    ),
    fill: cn(
      'bg-current transition-[clip-path]',
      // Horizontal
      'data-[orientation=horizontal]:w-(--media-slider-fill,0)',
      'group-data-dragging/slider:data-[orientation=horizontal]:w-(--media-slider-pointer)',
      // Vertical
      'data-[orientation=vertical]:h-(--media-slider-fill,0)',
      'group-data-dragging/slider:data-[orientation=vertical]:h-(--media-slider-pointer)'
    ),
    buffer: cn(
      'bg-current/20',
      // Horizontal
      'data-[orientation=horizontal]:transition-[clip-path,width] data-[orientation=horizontal]:w-(--media-slider-buffer,0)',
      // Vertical
      'data-[orientation=vertical]:transition-[clip-path,height] data-[orientation=vertical]:h-(--media-slider-buffer)'
    ),
  },
  segments: cn(
    'max-w-none overflow-visible',
    '[&_[data-slot=slider-segment]]:motion-safe:duration-200 [&_[data-slot=slider-segment]]:motion-safe:ease-out',
    // Horizontal
    'data-[orientation=horizontal]:w-[calc(100%+--spacing(1))] data-[orientation=horizontal]:h-full',
    'data-[orientation=horizontal]:[&_[data-slot=slider-segments-clip-path]]:-translate-x-1',
    'data-[orientation=horizontal]:[&_[data-slot=slider-segment]]:[rx:--spacing(0.375)]',
    'data-[orientation=horizontal]:[&_[data-slot=slider-segment][data-highlighted]]:[rx:--spacing(0.6875)]',
    'data-[orientation=horizontal]:[&_[data-slot=slider-segment]]:[width:calc(var(--media-slider-segment-size)---spacing(1))]',
    'data-[orientation=horizontal]:[&_[data-slot=slider-segment]]:[x:calc(var(--media-slider-segment-offset)+--spacing(1))]',
    'data-[orientation=horizontal]:[&_[data-slot=slider-segment]]:h-0.75',
    'data-[orientation=horizontal]:[&_[data-slot=slider-segment][data-highlighted]]:h-[--spacing(1.375)]',
    'data-[orientation=horizontal]:[&_[data-slot=slider-segment]]:transition-[height,rx,y]',
    'data-[orientation=horizontal]:[&_[data-slot=slider-segment]:not([data-highlighted])]:[y:--spacing(0.3125)]',
    'data-[orientation=horizontal]:[&_[data-slot=slider-segment][data-highlighted]]:[y:0]',
    // Vertical
    'data-[orientation=vertical]:w-full data-[orientation=vertical]:h-[calc(100%+--spacing(1))]',
    'data-[orientation=vertical]:[&_[data-slot=slider-segments-clip-path]]:-translate-y-1',
    'data-[orientation=vertical]:[&_[data-slot=slider-segment]]:[height:calc(var(--media-slider-segment-size)---spacing(1))]',
    'data-[orientation=vertical]:[&_[data-slot=slider-segment]]:[ry:--spacing(0.375)]',
    'data-[orientation=vertical]:[&_[data-slot=slider-segment][data-highlighted]]:[ry:--spacing(0.6875)]',
    'data-[orientation=vertical]:[&_[data-slot=slider-segment]]:[y:calc(100%-var(--media-slider-segment-offset)-var(--media-slider-segment-size)+--spacing(1))]',
    'data-[orientation=vertical]:[&_[data-slot=slider-segment]]:w-0.75',
    'data-[orientation=vertical]:[&_[data-slot=slider-segment][data-highlighted]]:w-[--spacing(1.375)]',
    'data-[orientation=vertical]:[&_[data-slot=slider-segment]]:transition-[width,ry,x]',
    'data-[orientation=vertical]:[&_[data-slot=slider-segment]:not([data-highlighted])]:[x:--spacing(0.3125)]',
    'data-[orientation=vertical]:[&_[data-slot=slider-segment][data-highlighted]]:[x:0]'
  ),
  thumb: {
    base: cn(
      'z-10 absolute size-3 -translate-x-1/2 -translate-y-1/2',
      'bg-current rounded-full',
      'shadow-[0_0_0_1px_var(--media-current-shadow-color,oklch(0_0_0/0.15)),0_1px_3px_0_oklch(0_0_0/0.15),0_1px_2px_-1px_oklch(0_0_0/0.15)]',
      'transition-[opacity,scale,outline-offset] duration-150 ease-out select-none',
      'outline-2 outline-transparent -outline-offset-2',
      'focus-visible:outline-current focus-visible:outline-offset-2',
      // Horizontal
      'data-[orientation=horizontal]:top-1/2 data-[orientation=horizontal]:left-(--media-slider-fill,0)',
      'group-data-dragging/slider:data-[orientation=horizontal]:left-(--media-slider-pointer)',
      // Vertical
      'data-[orientation=vertical]:left-1/2 data-[orientation=vertical]:top-[calc(100%-var(--media-slider-fill,0))]',
      'group-data-dragging/slider:data-[orientation=vertical]:top-[calc(100%-var(--media-slider-pointer))]'
    ),
    interactive: cn(
      'opacity-0 scale-70 origin-center',
      'group-hover/slider:opacity-100 group-hover/slider:scale-100',
      'group-focus-within/slider:opacity-100 group-focus-within/slider:scale-100'
    ),
  },
  preview: cn(
    'group/preview',
    '[--max-width:min(--spacing(48),100cqi)]',
    'min-w-full h-1',
    'before:absolute before:top-1/2 before:left-(--media-slider-pointer)',
    'before:-translate-x-1/2 before:-translate-y-1/2 before:bg-current/35',
    'before:opacity-0 before:scale-50',
    'before:transition-[opacity,scale] before:duration-200 before:ease-out',
    'data-pointing:not-data-dragging:before:opacity-100 data-pointing:not-data-dragging:before:scale-100',
    'data-[orientation=horizontal]:before:w-px data-[orientation=horizontal]:before:h-5',
    'data-[orientation=vertical]:before:w-5 data-[orientation=vertical]:before:h-px'
  ),
  thumbnail: cn(previewContent, '[--thumbnail-max-width:var(--max-width)] [bottom:calc(100%+--spacing(12))]'),
  value: cn(
    previewContent,
    '[bottom:calc(100%+--spacing(5))] flex flex-row-reverse justify-center gap-2 px-3 tabular-nums',
    'text-shadow-2xs text-shadow-(color:--media-current-shadow-color)'
  ),
  chapter: 'min-w-0 overflow-hidden text-ellipsis whitespace-nowrap',
};

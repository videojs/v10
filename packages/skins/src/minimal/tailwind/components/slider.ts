import { cn } from '@videojs/utils/style';

const previewContent = cn(
  'absolute [left:var(--preview-left,var(--media-slider-pointer))] max-w-(--max-width)',
  '-translate-x-1/2 translate-y-2 scale-80 opacity-0 blur-lg origin-bottom',
  'transition-[filter,opacity,scale] duration-150 ease-out',
  'group-data-pointing/preview:scale-100 group-data-pointing/preview:opacity-100',
  'group-data-pointing/preview:blur-none',
  'group-data-interactive/preview:group-not-data-pointing/preview:group-not-data-dragging/preview:scale-100',
  'group-data-interactive/preview:group-not-data-pointing/preview:group-not-data-dragging/preview:opacity-100',
  'group-data-interactive/preview:group-not-data-pointing/preview:group-not-data-dragging/preview:blur-none'
);

export const slider = {
  root: cn(
    'group/slider relative flex flex-1 items-center justify-center rounded-full outline-none cursor-pointer',
    // Horizontal
    'data-[orientation=horizontal]:min-w-20 data-[orientation=horizontal]:w-(--slider-width,100%) data-[orientation=horizontal]:h-(--slider-height,--spacing(8))',
    // Vertical
    'data-[orientation=vertical]:w-(--slider-width,--spacing(8)) data-[orientation=vertical]:h-(--slider-height,--spacing(20))'
  ),
  track: cn(
    'relative isolate overflow-hidden bg-current/20 rounded-[inherit] select-none',
    // Horizontal
    'data-[orientation=horizontal]:w-full data-[orientation=horizontal]:h-0.75',
    // Vertical
    'data-[orientation=vertical]:w-0.75 data-[orientation=vertical]:h-full'
  ),
  chapters: cn('relative flex flex-1 items-center min-w-0 min-h-0 size-full rounded-[inherit]'),
  chapter: {
    base: cn(
      'group/chapter absolute inset-0 flex items-center justify-center min-w-0 min-h-0',
      '[--chapter-gap:calc(var(--spacing)*1)] [--chapter-inset-start:0.5] [--chapter-inset-end:0.5]',
      'first:[--chapter-inset-start:0] last:[--chapter-inset-end:0]',
      'data-[orientation=horizontal]:[clip-path:inset(0_calc(100%-var(--media-slider-chapter-end))_0_var(--media-slider-chapter-start))]',
      'data-[orientation=vertical]:[clip-path:inset(calc(100%-var(--media-slider-chapter-end))_0_var(--media-slider-chapter-start)_0)]'
    ),
    track: cn(
      'relative isolate overflow-hidden bg-current/20 rounded-full select-none',
      'motion-safe:transition-[height,width] motion-safe:duration-200 motion-safe:ease-out',
      'data-[orientation=horizontal]:w-full data-[orientation=horizontal]:h-0.75',
      'group-data-highlighted/chapter:data-[orientation=horizontal]:h-[--spacing(1.25)]',
      'data-[orientation=horizontal]:[clip-path:inset(0_calc(100%-var(--media-slider-chapter-end)+var(--chapter-gap)*var(--chapter-inset-end))_0_calc(var(--media-slider-chapter-start)+var(--chapter-gap)*var(--chapter-inset-start))_round_calc(infinity*1px))]',
      'data-[orientation=vertical]:w-0.75 data-[orientation=vertical]:h-full',
      'group-data-highlighted/chapter:data-[orientation=vertical]:w-[--spacing(1.25)]',
      'data-[orientation=vertical]:[clip-path:inset(calc(100%-var(--media-slider-chapter-end)+var(--chapter-gap)*var(--chapter-inset-end))_0_calc(var(--media-slider-chapter-start)+var(--chapter-gap)*var(--chapter-inset-start))_0_round_calc(infinity*1px))]'
    ),
  },
  fill: {
    base: cn(
      'absolute rounded-[inherit] pointer-events-none',
      'motion-safe:duration-200 motion-safe:ease-linear',
      'data-dragging:duration-0 data-seeking:duration-0'
    ),
    fill: cn(
      'bg-(--accent-color)',
      // Horizontal
      'data-[orientation=horizontal]:inset-y-0 data-[orientation=horizontal]:left-0',
      'data-[orientation=horizontal]:transition-[width] data-[orientation=horizontal]:w-(--media-slider-fill,0)',
      'group-data-dragging/slider:data-[orientation=horizontal]:w-(--media-slider-pointer)',
      // Vertical
      'data-[orientation=vertical]:inset-x-0 data-[orientation=vertical]:bottom-0',
      'data-[orientation=vertical]:transition-[height] data-[orientation=vertical]:h-(--media-slider-fill,0)',
      'group-data-dragging/slider:data-[orientation=vertical]:h-(--media-slider-pointer)'
    ),
    buffer: cn(
      'bg-current/20 motion-safe:duration-250 motion-safe:ease-out',
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
      'shadow-[0_0_0_1px_var(--shadow-current-color,oklch(0_0_0/0.15)),0_1px_3px_0_oklch(0_0_0/0.15),0_1px_2px_-1px_oklch(0_0_0/0.15)]',
      'transition-[opacity,scale,outline-offset] motion-safe:transition-[opacity,scale,outline-offset,left,top] duration-150 ease-out select-none',
      'data-dragging:duration-0 data-seeking:duration-0',
      'outline-2 outline-transparent -outline-offset-2',
      'focus-visible:outline-(--focus-ring-color) focus-visible:outline-offset-2',
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
    'group/preview [--max-width:min(--spacing(48),100cqi)] [--max-height:--spacing(32)] min-w-full h-1',
    'before:absolute before:z-1 before:bg-current/35 before:pointer-events-none',
    'before:-translate-1/2 before:opacity-0 before:scale-50',
    'before:transition-[opacity,scale] before:duration-200 before:ease-out',
    'data-pointing:not-data-dragging:before:opacity-100 data-pointing:not-data-dragging:before:scale-100',
    'data-[orientation=horizontal]:before:top-1/2 data-[orientation=horizontal]:before:left-(--media-slider-pointer)',
    'data-[orientation=horizontal]:before:w-px data-[orientation=horizontal]:before:h-5',
    'data-[orientation=vertical]:before:top-[calc(100%-var(--media-slider-pointer))] data-[orientation=vertical]:before:left-1/2',
    'data-[orientation=vertical]:before:w-5 data-[orientation=vertical]:before:h-px'
  ),
  thumbnail: cn(previewContent, '[--thumbnail-max-width:var(--max-width)] [bottom:calc(100%+--spacing(12))]'),
  value: cn(
    previewContent,
    '[bottom:calc(100%+--spacing(5))] flex flex-row-reverse justify-center gap-2 px-3 tabular-nums',
    'text-shadow-2xs text-shadow-(color:--shadow-current-color)'
  ),
  chapterTitle: 'min-w-0 overflow-hidden text-ellipsis whitespace-nowrap empty:hidden',
};

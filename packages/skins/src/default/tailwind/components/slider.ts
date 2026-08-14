import { cn } from '@videojs/utils/style';

const previewContent = cn(
  'absolute left-1/2 max-w-(--max-width)',
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
    'data-[orientation=horizontal]:w-full data-[orientation=horizontal]:h-1',
    // Vertical
    'data-[orientation=vertical]:w-1 data-[orientation=vertical]:h-full'
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
      'data-[orientation=horizontal]:w-full data-[orientation=horizontal]:h-1',
      'group-data-highlighted/chapter:data-[orientation=horizontal]:h-1.75',
      'data-[orientation=horizontal]:[clip-path:inset(0_calc(100%-var(--media-slider-chapter-end)+var(--chapter-gap)*var(--chapter-inset-end))_0_calc(var(--media-slider-chapter-start)+var(--chapter-gap)*var(--chapter-inset-start))_round_calc(infinity*1px))]',
      'data-[orientation=vertical]:w-1 data-[orientation=vertical]:h-full',
      'group-data-highlighted/chapter:data-[orientation=vertical]:w-1.75',
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
      'data-[orientation=horizontal]:transition-[width] data-[orientation=horizontal]:w-(--media-slider-fill)',
      'group-data-dragging/slider:data-[orientation=horizontal]:w-(--media-slider-pointer)',
      // Vertical
      'data-[orientation=vertical]:inset-x-0 data-[orientation=vertical]:bottom-0',
      'data-[orientation=vertical]:transition-[height] data-[orientation=vertical]:h-(--media-slider-fill)',
      'group-data-dragging/slider:data-[orientation=vertical]:h-(--media-slider-pointer)'
    ),
    buffer: cn(
      'bg-current/20 motion-safe:duration-250 motion-safe:ease-out',
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
      'shadow-[0_0_0_1px_var(--shadow-current-color,oklch(0_0_0/0.1)),0_1px_3px_0_oklch(0_0_0/0.35),0_1px_2px_-1px_oklch(0_0_0/0.35)]',
      'transition-[opacity,height,width,outline-offset] motion-safe:transition-[opacity,height,width,outline-offset,left,top] duration-150 ease-out select-none',
      'data-dragging:duration-0 data-seeking:duration-0',
      'outline-4 outline-transparent -outline-offset-4',
      'hover:outline-current/15 hover:outline-offset-0',
      'focus-visible:outline-current/15 focus-visible:outline-offset-0',
      // Focus ring via ::after (matches default slider.css)
      'after:absolute after:-inset-1 after:rounded-[inherit]',
      'after:shadow-[0_0_0_2px_currentColor] after:pointer-events-none',
      'after:transition-[opacity,scale] after:duration-150 after:ease-out',
      'after:opacity-0 after:scale-50',
      'focus-visible:after:opacity-100 focus-visible:after:scale-100',
      // Horizontal
      'data-[orientation=horizontal]:top-1/2 data-[orientation=horizontal]:left-(--media-slider-fill)',
      'group-data-dragging/slider:data-[orientation=horizontal]:left-(--media-slider-pointer)',
      // Vertical
      'data-[orientation=vertical]:left-1/2 data-[orientation=vertical]:top-[calc(100%-var(--media-slider-fill))]',
      'group-data-dragging/slider:data-[orientation=vertical]:top-[calc(100%-var(--media-slider-pointer))]'
    ),
    persistent: 'size-3',
    interactive: cn(
      'size-2.5',
      'opacity-0 focus-visible:opacity-100 group-hover/slider:opacity-100',
      'group-active/slider:size-3 group-focus-within/slider:size-3'
    ),
  },
  preview: cn(
    'group/preview [--max-width:min(--spacing(48),100cqi)] [--max-height:--spacing(32)] min-w-(--max-width) h-1',
    'before:absolute before:z-1 before:top-1/2 before:left-1/2 before:size-1 before:bg-current before:rounded-full before:pointer-events-none',
    'before:shadow-[0_0_0_1px_var(--shadow-current-color,oklch(0_0_0/0.15)),0_1px_2px_0_oklch(0_0_0/0.35)]',
    'before:-translate-1/2 before:opacity-0 before:scale-50',
    'before:transition-[opacity,scale] before:duration-200 before:ease-out',
    'data-pointing:not-data-dragging:before:opacity-100 data-pointing:not-data-dragging:before:scale-100'
  ),
  thumbnail: cn(previewContent, '[--thumbnail-max-width:var(--max-width)] [bottom:calc(100%+--spacing(9))]'),
  value: cn(
    previewContent,
    '[bottom:calc(100%+--spacing(10.5))] flex flex-col items-center tabular-nums',
    'text-shadow-2xs text-shadow-(color:--shadow-current-color)'
  ),
  chapterTitle: 'min-w-0 max-w-(--max-width) px-3 overflow-hidden text-ellipsis whitespace-nowrap empty:hidden',
};

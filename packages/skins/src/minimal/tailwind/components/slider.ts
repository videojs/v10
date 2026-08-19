import { cn } from '@videojs/utils/style';

const previewContent = cn(
  'absolute [left:var(--preview-left,var(--media-slider-pointer))] max-w-(--max-size)',
  '-translate-x-1/2 translate-y-2 scale-80 opacity-0 blur-lg origin-bottom',
  'transition-[filter,opacity,scale] duration-150 ease-out',
  'group-data-pointing/slider:scale-100 group-data-pointing/slider:opacity-100',
  'group-data-pointing/slider:blur-none',
  'group-has-focus-visible/slider:scale-100 group-has-focus-visible/slider:opacity-100',
  'group-has-focus-visible/slider:blur-none'
);

export const slider = {
  root: cn(
    'group/slider relative flex flex-1 items-center justify-center rounded-(--track-border-radius) outline-none cursor-pointer',
    '[--track-border-radius:99px]',
    '[--chapter-gap:calc(var(--spacing)*1)] [--chapter-inset-start:calc(var(--chapter-gap)/2)] [--chapter-inset-end:calc(var(--chapter-gap)/2)]',
    // Horizontal
    'data-[orientation=horizontal]:min-w-20 data-[orientation=horizontal]:w-(--slider-width,100%) data-[orientation=horizontal]:h-(--slider-height,--spacing(8))',
    // Vertical
    'data-[orientation=vertical]:w-(--slider-width,--spacing(8)) data-[orientation=vertical]:h-(--slider-height,--spacing(20))'
  ),
  track: cn(
    'relative isolate overflow-hidden bg-current/20 rounded-(--track-border-radius) select-none',
    // Horizontal
    'data-[orientation=horizontal]:w-full data-[orientation=horizontal]:h-1',
    // Vertical
    'data-[orientation=vertical]:w-1 data-[orientation=vertical]:h-full'
  ),
  chapters: cn('relative flex flex-1 items-center min-w-0 min-h-0 size-full rounded-[inherit]'),
  chapter: {
    base: cn(
      'group/chapter absolute inset-0 flex items-center justify-center min-w-0 min-h-0',
      'first:[--chapter-inset-start:0px] last:[--chapter-inset-end:0px]',
      'data-[orientation=horizontal]:[clip-path:inset(0_calc(100%-var(--media-slider-chapter-end))_0_var(--media-slider-chapter-start))]',
      'data-[orientation=vertical]:[clip-path:inset(calc(100%-var(--media-slider-chapter-end))_0_var(--media-slider-chapter-start)_0)]'
    ),
    track: cn(
      'relative isolate overflow-hidden bg-current/20 rounded-(--track-border-radius) select-none',
      'motion-safe:transition-[height,width] motion-safe:duration-200 motion-safe:ease-out',
      'data-[orientation=horizontal]:w-full data-[orientation=horizontal]:h-1',
      'group-data-highlighted/chapter:data-[orientation=horizontal]:h-1.75',
      'data-[orientation=horizontal]:[clip-path:inset(0_calc(100%-var(--media-slider-chapter-end)+var(--chapter-inset-end))_0_calc(var(--media-slider-chapter-start)+var(--chapter-inset-start))_round_var(--track-border-radius))]',
      'data-[orientation=vertical]:w-1 data-[orientation=vertical]:h-full',
      'group-data-highlighted/chapter:data-[orientation=vertical]:w-1.75',
      'data-[orientation=vertical]:[clip-path:inset(calc(100%-var(--media-slider-chapter-end)+var(--chapter-inset-end))_0_calc(var(--media-slider-chapter-start)+var(--chapter-inset-start))_0_round_var(--track-border-radius))]'
    ),
  },
  fill: {
    base: cn(
      'absolute rounded-[inherit] pointer-events-none',
      'motion-safe:transition-[clip-path] motion-safe:duration-200 motion-safe:ease-out',
      'data-dragging:duration-0 data-seeking:duration-0'
    ),
    fill: cn(
      'bg-(--accent-color)',
      // Horizontal
      'data-[orientation=horizontal]:inset-y-0 data-[orientation=horizontal]:left-0 data-[orientation=horizontal]:w-full',
      'data-[orientation=horizontal]:[clip-path:inset(0_calc(100%-var(--media-slider-fill))_0_0_round_var(--track-border-radius))]',
      'group-data-dragging/slider:data-[orientation=horizontal]:[clip-path:inset(0_calc(100%-var(--media-slider-pointer))_0_0_round_var(--track-border-radius))]',
      // Vertical
      'data-[orientation=vertical]:inset-x-0 data-[orientation=vertical]:bottom-0 data-[orientation=vertical]:h-full',
      'data-[orientation=vertical]:[clip-path:inset(calc(100%-var(--media-slider-fill))_0_0_0_round_var(--track-border-radius))]',
      'group-data-dragging/slider:data-[orientation=vertical]:[clip-path:inset(calc(100%-var(--media-slider-pointer))_0_0_0_round_var(--track-border-radius))]'
    ),
    buffer: cn(
      'bg-current/20',
      // Horizontal
      'data-[orientation=horizontal]:inset-y-0 data-[orientation=horizontal]:left-0 data-[orientation=horizontal]:w-full',
      'data-[orientation=horizontal]:[clip-path:inset(0_calc(100%-var(--media-slider-buffer))_0_0_round_var(--track-border-radius))]',
      // Vertical
      'data-[orientation=vertical]:inset-x-0 data-[orientation=vertical]:bottom-0 data-[orientation=vertical]:h-full',
      'data-[orientation=vertical]:[clip-path:inset(calc(100%-var(--media-slider-buffer))_0_0_0_round_var(--track-border-radius))]'
    ),
  },
  thumb: {
    base: cn(
      'z-10 absolute size-3 -translate-x-1/2 -translate-y-1/2',
      'bg-current rounded-full',
      'opacity-0 scale-70 origin-center',
      'shadow-[0_0_0_1px_var(--shadow-current-color,oklch(0_0_0/0.15)),0_1px_3px_0_oklch(0_0_0/0.15),0_1px_2px_-1px_oklch(0_0_0/0.15)]',
      'transition-none motion-safe:transition-[opacity,height,width,outline-offset,left,top,scale] duration-150 ease-out select-none',
      'data-dragging:duration-0 data-seeking:duration-0',
      'group-active/slider:size-3.5',
      'outline-2 outline-transparent -outline-offset-2',
      'focus-visible:outline-(--focus-ring-color) focus-visible:outline-offset-2',
      'focus-visible:opacity-100 focus-visible:scale-100',
      // Horizontal
      'data-[orientation=horizontal]:top-1/2 data-[orientation=horizontal]:left-(--media-slider-fill,0)',
      'group-data-dragging/slider:data-[orientation=horizontal]:left-(--media-slider-pointer)',
      // Vertical
      'data-[orientation=vertical]:left-1/2 data-[orientation=vertical]:top-[calc(100%-var(--media-slider-fill,0))]',
      'group-data-dragging/slider:data-[orientation=vertical]:top-[calc(100%-var(--media-slider-pointer))]'
    ),
    persistent: 'opacity-100 scale-100',
    interactive: cn('pointer-fine:group-hover/slider:opacity-100 pointer-fine:group-hover/slider:scale-100'),
  },
  preview: cn(
    '[--max-size-factor:28]',
    '[--max-size:min(calc(var(--spacing)*var(--max-size-factor)),100cqi)]',
    '@lg/media-root:[--max-size-factor:36] @2xl/media-root:[--max-size-factor:48]',
    'min-w-full h-1',
    'before:absolute before:z-1 before:bg-current/35 before:pointer-events-none',
    'before:-translate-1/2 before:opacity-0 before:scale-50',
    'before:transition-[opacity,scale] before:duration-200 before:ease-out',
    'data-pointing:not-data-dragging:before:opacity-100 data-pointing:not-data-dragging:before:scale-100',
    'data-[orientation=horizontal]:before:top-1/2 data-[orientation=horizontal]:before:left-(--media-slider-pointer)',
    'data-[orientation=horizontal]:before:w-px data-[orientation=horizontal]:before:h-5',
    'data-[orientation=vertical]:before:top-[calc(100%-var(--media-slider-pointer))] data-[orientation=vertical]:before:left-1/2',
    'data-[orientation=vertical]:before:w-5 data-[orientation=vertical]:before:h-px'
  ),
  thumbnail: cn(
    previewContent,
    '[--thumbnail-max-width:var(--max-size)] [--thumbnail-max-height:var(--max-size)]',
    '[bottom:calc(100%+--spacing(11))]'
  ),
  value: cn(
    previewContent,
    '[bottom:calc(100%+--spacing(5))] flex flex-row-reverse justify-center gap-2 px-3 tabular-nums',
    'text-shadow-2xs text-shadow-(color:--shadow-current-color)'
  ),
  chapterTitle: 'min-w-0 overflow-hidden text-ellipsis whitespace-nowrap empty:hidden',
};

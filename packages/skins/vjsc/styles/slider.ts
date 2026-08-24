export const sliderRoot = {
  utilities: [
    'group/slider relative flex flex-1 cursor-pointer items-center justify-center rounded-media-control outline-none',
    'data-[orientation=horizontal]:[height:var(--media-slider-height,--spacing(8))] data-[orientation=horizontal]:min-w-20',
    'data-[orientation=vertical]:h-20 data-[orientation=vertical]:w-8 data-[orientation=vertical]:min-w-0',
  ],
} as const;

export const sliderTrack = {
  utilities: [
    'relative isolate w-full select-none overflow-hidden rounded-media-control bg-current/20',
    'data-[orientation=horizontal]:h-1 data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1',
  ],
} as const;

const sliderProgress = [
  'pointer-events-none absolute rounded-[inherit]',
  'motion-safe:transition-[clip-path] motion-safe:duration-200 motion-safe:ease-out',
  'group-data-dragging/slider:duration-0 group-data-seeking/slider:duration-0',
] as const;

export const sliderFill = {
  utilities: [
    ...sliderProgress,
    'bg-media-accent',
    'data-[orientation=horizontal]:inset-y-0 data-[orientation=horizontal]:left-0 data-[orientation=horizontal]:w-full',
    'data-[orientation=horizontal]:[clip-path:inset(0_calc(100%-var(--media-slider-fill))_0_0_round_var(--media-control-radius))]',
    'group-data-dragging/slider:data-[orientation=horizontal]:[clip-path:inset(0_calc(100%-var(--media-slider-pointer))_0_0_round_var(--media-control-radius))]',
    'data-[orientation=vertical]:inset-x-0 data-[orientation=vertical]:bottom-0 data-[orientation=vertical]:h-full',
    'data-[orientation=vertical]:[clip-path:inset(calc(100%-var(--media-slider-fill))_0_0_0_round_var(--media-control-radius))]',
    'group-data-dragging/slider:data-[orientation=vertical]:[clip-path:inset(calc(100%-var(--media-slider-pointer))_0_0_0_round_var(--media-control-radius))]',
  ],
} as const;

export const sliderBuffer = {
  utilities: [
    ...sliderProgress,
    'bg-current/20',
    'data-[orientation=horizontal]:inset-y-0 data-[orientation=horizontal]:left-0 data-[orientation=horizontal]:w-full',
    'data-[orientation=horizontal]:[clip-path:inset(0_calc(100%-var(--media-slider-buffer))_0_0_round_var(--media-control-radius))]',
    'data-[orientation=vertical]:inset-x-0 data-[orientation=vertical]:bottom-0 data-[orientation=vertical]:h-full',
    'data-[orientation=vertical]:[clip-path:inset(calc(100%-var(--media-slider-buffer))_0_0_0_round_var(--media-control-radius))]',
  ],
} as const;

export const sliderThumb = {
  utilities: [
    'absolute z-10 top-1/2 left-(--media-slider-fill) -translate-x-1/2 -translate-y-1/2 rounded-media-control bg-current',
    'select-none transition-none motion-safe:transition-[opacity,height,width,outline-offset,left,top,scale] motion-safe:duration-150 motion-safe:ease-out',
    'group-data-dragging/slider:motion-safe:transition-[opacity,height,width,outline-offset,scale]',
    'group-data-dragging/slider:scale-90',
    'data-[orientation=vertical]:top-[calc(100%-var(--media-slider-fill))] data-[orientation=vertical]:left-1/2',
    'group-data-dragging/slider:data-[orientation=horizontal]:left-(--media-slider-pointer)',
    'group-data-dragging/slider:data-[orientation=vertical]:top-[calc(100%-var(--media-slider-pointer))]',
  ],
  variants: {
    default: [
      'size-3 scale-80 outline-4 -outline-offset-4 outline-transparent',
      'shadow-[0_0_0_1px_rgb(0_0_0/0.1),0_1px_3px_0_rgb(0_0_0/0.35),0_1px_2px_-1px_rgb(0_0_0/0.35)]',
      'hover:outline-current/15 hover:outline-offset-0 focus-visible:outline-current/15 focus-visible:outline-offset-0',
      'after:pointer-events-none after:absolute after:-inset-1 after:scale-50 after:rounded-[inherit] after:opacity-0',
      'after:shadow-[0_0_0_2px_currentColor] motion-safe:after:transition-[opacity,scale] motion-safe:after:duration-150 motion-safe:after:ease-out',
      'focus-visible:after:scale-100 focus-visible:after:opacity-100',
    ],
    minimal: [
      'size-3 scale-70 outline-2 -outline-offset-2 outline-transparent',
      'shadow-[0_0_0_1px_rgb(0_0_0/0.15),0_1px_3px_0_rgb(0_0_0/0.15),0_1px_2px_-1px_rgb(0_0_0/0.15)]',
      'focus-visible:outline-white focus-visible:outline-offset-2',
    ],
  },
} as const;

export const sliderPreviewContent = [
  'absolute max-w-(--media-slider-preview-max-width) -translate-x-1/2 translate-y-2 scale-80 opacity-0',
  'origin-bottom blur-md',
  'motion-safe:transition-[filter,opacity,scale] motion-safe:duration-150 motion-safe:ease-out',
  'group-data-pointing/preview:scale-100 group-data-pointing/preview:opacity-100 group-data-pointing/preview:filter-none',
  'group-data-interactive/preview:group-not-data-pointing/preview:group-not-data-dragging/preview:scale-100',
  'group-data-interactive/preview:group-not-data-pointing/preview:group-not-data-dragging/preview:opacity-100',
  'group-data-interactive/preview:group-not-data-pointing/preview:group-not-data-dragging/preview:filter-none',
] as const;

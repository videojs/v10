import { cn } from '@videojs/utils/style';

const feedbackColor = '[color:var(--media-color-primary,oklch(1_0_0))]';
const islandRoot = cn('absolute left-1/2 top-3 -translate-x-1/2 pointer-events-none', feedbackColor);
const islandContent = cn(
  'flex justify-between items-center gap-2 px-2.5 py-1',
  // Increase contrast of content via blend mode
  '**:mix-blend-difference'
);
const islandBase = cn(
  // Surface override (darker than default)
  '[--media-surface-background-color:oklch(0_0_0/0.25)]',
  // Layout
  'absolute top-3 rounded-full origin-top pointer-events-none',
  'text-inherit font-medium',
  // Transition
  'duration-100 ease-out',
  'data-starting-style:opacity-0',
  'data-ending-style:opacity-0',
  'data-starting-style:duration-250',
  'data-starting-style:ease-in',
  'data-ending-style:duration-250',
  'data-ending-style:ease-in',
  'pointer-coarse:will-change-[scale,translate,opacity]',
  'pointer-coarse:transition-[scale,translate,opacity]',
  'pointer-fine:motion-safe:will-change-[scale,translate,filter,opacity]',
  'pointer-fine:motion-safe:transition-[scale,translate,filter,opacity]',
  'pointer-fine:motion-safe:data-starting-style:blur-sm',
  'pointer-fine:motion-safe:data-starting-style:scale-90',
  'pointer-fine:motion-safe:data-ending-style:blur-sm',
  'pointer-fine:motion-safe:data-ending-style:scale-90',
  'motion-safe:data-ending-style:-translate-y-1/4',
  // Reduced transparency / high contrast: solid surface background
  '[@media(prefers-reduced-transparency:reduce)]:[--media-surface-background-color:oklch(0_0_0)]',
  'contrast-more:[--media-surface-background-color:oklch(0_0_0)]'
);

const bubbleRoot = cn(
  'absolute pointer-events-none',
  'top-[calc(50%-1.75rem)] -translate-y-1/2',
  '@2xl/media-container:top-1/2',
  feedbackColor
);
const bubbleBase = cn(
  // Default placement - center column for status bubbles and undirected seeks
  'col-start-2 row-start-1',
  'flex flex-col items-center justify-center p-4',
  'transition-opacity duration-250 ease-out',
  'data-starting-style:opacity-0',
  'data-ending-style:opacity-0',
  'data-starting-style:duration-200',
  'data-starting-style:ease-in',
  'data-ending-style:duration-200',
  'data-ending-style:ease-in',
  '@2xl/media-container:p-8',
  'not-data-direction:[transition-property:opacity,scale]',
  'not-data-direction:duration-600',
  'not-data-direction:[transition-timing-function:ease-out,linear(0,0.12_1.5%,1.35_9.7%,2.2_13.9%,3_19.9%,2.7_21.8%,0.62_37.5%,0.96_50.9%,1)]',
  'motion-reduce:not-data-direction:transition-opacity',
  'motion-reduce:not-data-direction:duration-100',
  'motion-reduce:not-data-direction:ease-out',
  'not-data-direction:data-starting-style:scale-80',
  'not-data-direction:data-ending-style:scale-80',
  'not-data-direction:data-starting-style:duration-200',
  'not-data-direction:data-starting-style:ease-in',
  'not-data-direction:data-ending-style:duration-200',
  'not-data-direction:data-ending-style:ease-in',
  // Direction placement
  'data-[direction=backward]:col-start-1 data-[direction=backward]:justify-self-start',
  'data-[direction=forward]:col-start-3 data-[direction=forward]:justify-self-end'
);

/**
 * NOTE: tailwind.css is required to support the `@property --media-progress-fill` registration and animation keyframes. You should import from either:
 * - "@videojs/html/tailwind.css" for HTML skins
 * - "@videojs/react/tailwind.css" for React skins
 */
export const volumeIndicator = cn(
  islandRoot,
  'group/volume-indicator',
  islandBase,
  'w-[min(80%,12rem)]',
  '*:[--media-progress-fill:var(--media-volume-fill)]',
  '*:rounded-[inherit]',
  '*:[background-image:linear-gradient(to_right,currentColor_0%,currentColor_var(--media-progress-fill),transparent_var(--media-progress-fill),transparent_100%)]',
  '*:[transition:--media-progress-fill_200ms_linear]',
  'data-open:duration-100',
  // Boundary shake (keyframes must be registered and media-shake added to @theme - see note at top)
  'data-min:animate-media-shake',
  'data-max:animate-media-shake',
  'motion-reduce:data-min:animate-none',
  'motion-reduce:data-max:animate-none'
);

export const statusIndicatorTop = cn(
  islandRoot,
  'group/status-indicator-top',
  islandBase,
  islandContent,
  'data-open:duration-100'
);

export const seekIndicator = cn(
  bubbleRoot,
  'not-data-direction:left-1/2 not-data-direction:-translate-x-1/2',
  'data-[direction=backward]:left-0',
  'data-[direction=forward]:right-0',
  'group/seek-indicator',
  bubbleBase
);

export const statusIndicatorCenter = cn(
  bubbleRoot,
  'left-1/2 -translate-x-1/2',
  'group/status-indicator-center',
  bubbleBase
);

export const indicatorContent = cn(islandContent, 'w-full');
export const indicatorValue = 'ml-auto';

export const volumeIndicatorIcon = cn('hidden shrink-0');
export const volumeIndicatorHighIcon = 'group-data-[level=high]/volume-indicator:block';
export const volumeIndicatorLowIcon = 'group-data-[level=low]/volume-indicator:block';
export const volumeIndicatorOffIcon = 'group-data-[level=off]/volume-indicator:block';

export const statusIndicatorTopIcon = cn('hidden shrink-0');
export const statusIndicatorCaptionsOnIcon = 'group-data-[status=captions-on]/status-indicator-top:block';
export const statusIndicatorCaptionsOffIcon = 'group-data-[status=captions-off]/status-indicator-top:block';
export const statusIndicatorFullscreenEnterIcon = cn(
  'group-data-[status=fullscreen]/status-indicator-top:block',
  'motion-safe:group-not-data-starting-style/status-indicator-top:group-data-[status=fullscreen]/status-indicator-top:animate-media-pop-in'
);
export const statusIndicatorFullscreenExitIcon = cn(
  'group-data-[status=exit-fullscreen]/status-indicator-top:block',
  'motion-safe:group-not-data-starting-style/status-indicator-top:group-data-[status=exit-fullscreen]/status-indicator-top:animate-media-pop-in'
);
export const statusIndicatorPipEnterIcon = cn(
  'group-data-[status=pip]/status-indicator-top:block',
  'motion-safe:group-not-data-starting-style/status-indicator-top:group-data-[status=pip]/status-indicator-top:animate-media-pop-in'
);
export const statusIndicatorPipExitIcon = cn(
  'group-data-[status=exit-pip]/status-indicator-top:block',
  'motion-safe:group-not-data-starting-style/status-indicator-top:group-data-[status=exit-pip]/status-indicator-top:animate-media-pop-in'
);

export const seekIndicatorIcon = cn(
  'hidden w-9 h-9',
  'group-data-direction/seek-indicator:block',
  'group-data-[direction=backward]/seek-indicator:-scale-x-100',
  // Slide animation (keyframes registered in companion CSS)
  'group-not-data-starting-style/seek-indicator:group-data-[direction=forward]/seek-indicator:animate-media-slide-in-forward',
  'group-not-data-starting-style/seek-indicator:group-data-[direction=backward]/seek-indicator:animate-media-slide-in-backward',
  'motion-reduce:group-data-direction/seek-indicator:animate-none'
);
export const seekIndicatorValue = 'tabular-nums';

export const statusIndicatorCenterIcon = 'hidden w-9 h-9';
export const statusIndicatorPauseIcon = cn(
  'group-data-[status=pause]/status-indicator-center:block',
  'motion-safe:group-not-data-starting-style/status-indicator-center:group-data-[status=pause]/status-indicator-center:animate-media-pop-in'
);
export const statusIndicatorPlayIcon = cn(
  'group-data-[status=play]/status-indicator-center:block',
  'motion-safe:group-not-data-starting-style/status-indicator-center:group-data-[status=play]/status-indicator-center:animate-media-pop-in'
);

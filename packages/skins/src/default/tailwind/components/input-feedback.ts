import { cn } from '@videojs/utils/style';

/**
 * NOTE: tailwind.css is required to support the `@property --media-progress-fill` registration and animation keyframes. You should import from either:
- "@videojs/html/tailwind.css" for HTML skins
- "@videojs/react/tailwind.css" for React skins
 */
export const inputFeedback = {
  root: cn(
    // Layout
    'absolute inset-x-0 top-0 bottom-14 pointer-events-none',
    'grid grid-cols-3 items-center justify-items-center',
    // Shift to full extent in larger containers
    '@2xl/media-root:bottom-0',
    // Color
    '[color:var(--media-color-primary,oklch(1_0_0))]'
  ),

  island: {
    base: cn(
      'group/input-indicator',
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
    ),
    content: cn(
      'flex justify-between items-center gap-2 px-2.5 py-1 w-full',
      // Increase contrast of content via blend mode
      '**:mix-blend-difference'
    ),
    // Volume island sizing + progress-fill gradient on the content child
    volume: cn(
      'w-[min(80%,12rem)]',
      '*:[--media-progress-fill:var(--media-volume-fill)]',
      '*:rounded-[inherit]',
      '*:[background-image:linear-gradient(to_right,currentColor_0%,currentColor_var(--media-progress-fill),transparent_var(--media-progress-fill),transparent_100%)]',
      '*:[transition:--media-progress-fill_200ms_linear]'
    ),
    // Shown state — applied on the active item itself
    shownVolume: cn(
      'data-open:duration-100',
      // Boundary shake (keyframes must be registered and media-shake added to @theme — see note at top)
      'data-min:animate-media-shake',
      'data-max:animate-media-shake',
      'motion-reduce:data-min:animate-none',
      'motion-reduce:data-max:animate-none'
    ),
    shownStatus: cn('data-open:duration-100'),
    // Icon inside island — hidden by default; specific icons opt in via shown* below.
    icon: cn('hidden shrink-0'),
    // Volume level → which icon shows
    shownVolumeHigh: 'group-data-[level=high]/input-indicator:block',
    shownVolumeLow: 'group-data-[level=low]/input-indicator:block',
    shownVolumeOff: 'group-data-[level=off]/input-indicator:block',
    // Captions state → which icon shows
    shownCaptionsOn: 'group-data-[status=captions-on]/input-indicator:block',
    shownCaptionsOff: 'group-data-[status=captions-off]/input-indicator:block',
    shownFullscreenEnter: cn(
      'group-data-[status=fullscreen]/input-indicator:block',
      'motion-safe:group-not-data-starting-style/input-indicator:group-data-[status=fullscreen]/input-indicator:animate-media-pop-in'
    ),
    shownFullscreenExit: cn(
      'group-data-[status=exit-fullscreen]/input-indicator:block',
      'motion-safe:group-not-data-starting-style/input-indicator:group-data-[status=exit-fullscreen]/input-indicator:animate-media-pop-in'
    ),
    shownPipEnter: cn(
      'group-data-[status=pip]/input-indicator:block',
      'motion-safe:group-not-data-starting-style/input-indicator:group-data-[status=pip]/input-indicator:animate-media-pop-in'
    ),
    shownPipExit: cn(
      'group-data-[status=exit-pip]/input-indicator:block',
      'motion-safe:group-not-data-starting-style/input-indicator:group-data-[status=exit-pip]/input-indicator:animate-media-pop-in'
    ),
    value: 'ml-auto',
  },

  bubble: {
    base: cn(
      'group/input-indicator',
      // Default placement — center column for status bubbles and undirected seeks
      'col-start-2 row-start-1',
      'flex flex-col items-center justify-center p-4',
      'transition-opacity duration-250 ease-out',
      'data-starting-style:opacity-0',
      'data-ending-style:opacity-0',
      'data-starting-style:duration-200',
      'data-starting-style:ease-in',
      'data-ending-style:duration-200',
      'data-ending-style:ease-in',
      '@2xl/media-root:p-8',
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
    ),
    // Icons in the bubble
    icon: 'hidden w-9 h-9',
    // seek icon: shown for seekStep + seekToPercent; flipped for backward; slides in on active
    shownSeek: cn(
      'group-data-direction/input-indicator:block',
      'group-data-[direction=backward]/input-indicator:-scale-x-100',
      // Slide animation (keyframes registered in companion CSS)
      'group-not-data-starting-style/input-indicator:group-data-[direction=forward]/input-indicator:animate-media-slide-in-forward',
      'group-not-data-starting-style/input-indicator:group-data-[direction=backward]/input-indicator:animate-media-slide-in-backward',
      'motion-reduce:group-data-direction/input-indicator:animate-none'
    ),
    // togglePaused: pause icon when paused, play icon when playing
    shownPause: cn(
      'group-data-[status=pause]/input-indicator:block',
      'motion-safe:group-not-data-starting-style/input-indicator:group-data-[status=pause]/input-indicator:animate-media-pop-in'
    ),
    shownPlay: cn(
      'group-data-[status=play]/input-indicator:block',
      'motion-safe:group-not-data-starting-style/input-indicator:group-data-[status=play]/input-indicator:animate-media-pop-in'
    ),
    time: 'tabular-nums',
  },
};

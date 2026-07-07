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
    shownFullscreenEnter: 'group-data-[status=fullscreen]/input-indicator:block',
    shownFullscreenExit: 'group-data-[status=exit-fullscreen]/input-indicator:block',
    shownPipEnter: 'group-data-[status=pip]/input-indicator:block',
    shownPipExit: 'group-data-[status=exit-pip]/input-indicator:block',
    value: 'ml-auto',
  },

  bubble: {
    base: cn(
      'group/input-indicator',
      // Default placement
      'col-start-2 row-start-1',
      'grid place-content-center text-center p-4',
      'data-direction:gap-1',
      '@2xl/media-root:data-direction:p-6',
      // Central bubble (play, pause)
      'not-data-direction:bg-black/35 not-data-direction:rounded-full not-data-direction:backdrop-blur-sm',
      'not-data-direction:[transition-property:opacity,scale]',
      'not-data-direction:duration-200 not-data-direction:ease-out',
      'motion-reduce:not-data-direction:transition-opacity',
      'motion-reduce:not-data-direction:duration-50',
      'not-data-direction:data-starting-style:opacity-0',
      'not-data-direction:data-ending-style:opacity-0',
      'not-data-direction:data-starting-style:scale-[0.85]',
      'not-data-direction:data-ending-style:scale-[0.85]',
      'not-data-direction:data-ending-style:duration-100',
      'not-data-direction:data-ending-style:ease-in',
      // Direction placement
      'data-[direction=backward]:col-start-1 data-[direction=backward]:justify-self-start',
      'data-[direction=forward]:col-start-3 data-[direction=forward]:justify-self-end'
    ),
    // Icons in the bubble
    icon: 'hidden size-[calc(var(--media-icon-size)*1.5)]',
    // Seek icon: shown for seekStep + seekToPercent; flipped for backward.
    shownSeek: cn(
      'group-data-direction/input-indicator:block',
      'group-data-[direction=backward]/input-indicator:[scale:-1_1]',
      'motion-safe:transition-[translate,opacity] motion-safe:duration-200 motion-safe:ease-in-out',
      'motion-safe:group-data-starting-style/input-indicator:opacity-0',
      'motion-safe:group-data-ending-style/input-indicator:opacity-0',
      'motion-safe:group-data-[direction=forward]/input-indicator:group-data-starting-style/input-indicator:[translate:-60%_0]',
      'motion-safe:group-data-[direction=backward]/input-indicator:group-data-starting-style/input-indicator:[translate:60%_0]'
    ),
    // togglePaused: pause icon when paused, play icon when playing
    shownPause: 'group-data-[status=pause]/input-indicator:block',
    shownPlay: cn(
      'group-data-[status=play]/input-indicator:block',
      'group-data-[status=play]/input-indicator:translate-x-px'
    ),
    time: 'tabular-nums',
  },
};

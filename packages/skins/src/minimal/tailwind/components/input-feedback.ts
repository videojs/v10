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
    'grid grid-cols-3 items-center justify-items-center overflow-hidden',
    'rounded-[inherit]',
    // Shift to full extent in larger containers
    '@2xl/media-root:bottom-0',
    // Color
    '[color:var(--media-color-primary,oklch(1_0_0))]'
  ),

  island: {
    // Minimal island is a top strip with a gradient backdrop (no surface treatment)
    base: cn(
      'group/input-indicator',
      'absolute top-0 inset-x-0',
      'pt-3 pb-32',
      'flex justify-center',
      'text-inherit font-medium',
      'origin-top pointer-events-none',
      // Transition
      'duration-100 ease-out',
      'data-starting-style:opacity-0',
      'data-ending-style:opacity-0',
      'data-starting-style:duration-400',
      'data-starting-style:ease-in',
      'data-ending-style:duration-400',
      'data-ending-style:ease-in',
      '[background-image:linear-gradient(to_bottom,oklch(0_0_0/0.35),oklch(0_0_0/0.2)_3rem,oklch(0_0_0/0))]',
      'text-shadow-2xs text-shadow-(color:--media-current-shadow-color)',
      // Pointer-dependent transition props
      'pointer-fine:will-change-[translate,filter,opacity]',
      'pointer-fine:transition-[translate,filter,opacity]',
      'pointer-coarse:will-change-[translate,opacity]',
      'pointer-coarse:transition-[translate,opacity]',
      'pointer-fine:motion-safe:data-starting-style:blur-sm',
      'pointer-fine:motion-safe:data-ending-style:blur-sm',
      'motion-safe:data-ending-style:-translate-y-full'
    ),
    content: cn(
      'flex justify-between items-center gap-2 px-2.5 py-1',
      // Keep the label pinned to the end even when the icon is hidden during dismissal
      '*:last:ml-auto',
      // Reduced transparency / high contrast: solid content background
      '[@media(prefers-reduced-transparency:reduce)]:bg-(--media-controls-background-color)',
      '[@media(prefers-reduced-transparency:reduce)]:rounded-lg',
      'contrast-more:bg-(--media-controls-background-color) contrast-more:rounded-lg'
    ),
    // Volume island sizing + progress-fill on nested __progress element
    volume: cn(
      // Content is sized
      '*:data-feedback-island-content:w-[min(80%,14rem)]'
    ),
    // Progress bar (nested inside content) — its own element in the minimal variant
    volumeProgress: cn(
      '[--media-progress-fill:var(--media-volume-fill)]',
      'w-full h-0.75 rounded-full',
      '[background-image:linear-gradient(to_right,currentColor_0%,currentColor_var(--media-progress-fill),oklch(from_currentColor_l_c_h/0.2)_var(--media-progress-fill),oklch(from_currentColor_l_c_h/0.2)_100%)]',
      'shadow-[0_1px_0_var(--media-current-shadow-color-subtle)]'
    ),
    // Shown state — applied on the active item itself
    shownVolume: cn(
      'data-open:duration-100',
      // Boundary shake (keyframes must be registered and media-shake added to @theme — see note at top)
      'data-min:*:data-feedback-island-content:animate-media-shake',
      'data-max:*:data-feedback-island-content:animate-media-shake',
      'motion-reduce:data-min:*:data-feedback-island-content:animate-none',
      'motion-reduce:data-max:*:data-feedback-island-content:animate-none'
    ),
    shownStatus: cn('data-open:duration-100'),
    // Icon inside island — hidden by default; specific icons opt in via shown* below.
    icon: cn('hidden shrink-0', 'drop-shadow-[0_1px_0_var(--media-current-shadow-color)]'),
    shownVolumeHigh: 'group-data-[level=high]/input-indicator:block',
    shownVolumeLow: 'group-data-[level=low]/input-indicator:block',
    shownVolumeOff: 'group-data-[level=off]/input-indicator:block',
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
    icon: 'hidden w-9 h-9',
    shownSeek: cn(
      'group-data-direction/input-indicator:block',
      'group-data-[direction=backward]/input-indicator:-scale-x-100',
      // Slide animation (keyframes registered in companion CSS)
      'group-not-data-starting-style/input-indicator:group-data-[direction=forward]/input-indicator:animate-media-slide-in-forward',
      'group-not-data-starting-style/input-indicator:group-data-[direction=backward]/input-indicator:animate-media-slide-in-backward',
      'motion-reduce:group-data-direction/input-indicator:animate-none'
    ),
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

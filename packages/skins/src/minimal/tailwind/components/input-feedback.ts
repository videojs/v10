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
    icon: 'hidden size-[calc(var(--media-icon-size)*2)]',
    shownSeek: cn(
      // Avoid two arbitrary `size-*` utilities on one element (order-dependent); mirror CSS `[data-direction] .media-icon--seek` specificity.
      'group-data-direction/input-indicator:size-[calc(var(--media-icon-size)*1.5)]',
      'group-data-direction/input-indicator:block',
      'group-data-[direction=backward]/input-indicator:[scale:-1_1]',
      'motion-safe:transition-[translate,opacity] motion-safe:duration-200 motion-safe:ease-in-out',
      'motion-safe:group-data-starting-style/input-indicator:opacity-0',
      'motion-safe:group-data-ending-style/input-indicator:opacity-0',
      'motion-safe:group-data-[direction=forward]/input-indicator:group-data-starting-style/input-indicator:[translate:-60%_0]',
      'motion-safe:group-data-[direction=backward]/input-indicator:group-data-starting-style/input-indicator:[translate:60%_0]'
    ),
    shownPause: 'group-data-[status=pause]/input-indicator:block',
    shownPlay: 'group-data-[status=play]/input-indicator:block',
    time: 'tabular-nums',
  },
};

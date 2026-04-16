import { cn } from '@videojs/utils/style';

/**
 * NOTE: Keyframes (`media-shake`, `media-slide-in-forward`,
 * `media-slide-in-backward`, `media-pop-in`) and the
 * `@property --media-progress-fill-percentage`
 * registration are defined in `@videojs/skins/default/css/components/input-feedback.css`.
 * Tailwind consumers should import that file (or redefine the animations) for the
 * boundary-shake and slide-in animations to work.
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
      'group/input-feedback-item',
      'absolute top-0 inset-x-0',
      'pt-3 pb-32',
      'flex justify-center',
      'text-inherit font-medium',
      'origin-top pointer-events-none',
      // Transition
      'duration-100 ease-out',
      'data-starting-style:opacity-0',
      'data-ending-style:opacity-0',
      'data-starting-style:duration-[400ms]',
      'data-starting-style:ease-in',
      'data-ending-style:duration-[400ms]',
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
      'motion-safe:data-starting-style:[translate:0_-100%]',
      'motion-safe:data-ending-style:[translate:0_-100%]'
    ),
    content: cn(
      'flex justify-between items-center gap-2 px-2.5 py-1',
      // Keep the label pinned to the end even when the icon is hidden during dismissal
      '[&>:last-child]:ml-auto',
      // Reduced transparency / high contrast: solid content background
      '[@media(prefers-reduced-transparency:reduce)]:bg-(--media-controls-background-color)',
      '[@media(prefers-reduced-transparency:reduce)]:rounded-lg',
      'contrast-more:bg-(--media-controls-background-color) contrast-more:rounded-lg'
    ),
    // Volume island sizing + progress-fill on nested __progress element
    volume: cn(
      // Content is sized
      '[&>[data-feedback-island-content]]:w-[min(80%,14rem)]'
    ),
    // Progress bar (nested inside content) — its own element in the minimal variant
    volumeProgress: cn(
      '[--media-progress-fill-percentage:var(--media-volume-percentage)]',
      'w-full h-[0.1875rem] rounded-full',
      '[background-image:linear-gradient(to_right,currentColor_0%,currentColor_var(--media-progress-fill-percentage),oklch(from_currentColor_l_c_h/0.2)_var(--media-progress-fill-percentage),oklch(from_currentColor_l_c_h/0.2)_100%)]',
      'shadow-[0_1px_0_var(--media-current-shadow-color-subtle)]'
    ),
    // Shown state — applied on the active item itself
    shownVolume: cn(
      'data-active:data-[group=volume]:duration-100',
      // Boundary shake (keyframes must be registered and media-shake added to @theme — see note at top)
      'data-[boundary=min]:[&>[data-feedback-island-content]]:animate-media-shake',
      'data-[boundary=max]:[&>[data-feedback-island-content]]:animate-media-shake',
      'motion-reduce:data-[boundary]:[&>[data-feedback-island-content]]:animate-none'
    ),
    shownCaptions: cn('data-active:data-[group=captions]:duration-100'),
    // Icon inside island — hidden by default; specific icons opt in via shown* below.
    icon: cn('hidden shrink-0', 'drop-shadow-[0_1px_0_var(--media-current-shadow-color)]'),
    shownVolumeHigh: 'group-data-[volume-level=high]/input-feedback-item:block',
    shownVolumeLow: 'group-data-[volume-level=low]/input-feedback-item:block',
    shownVolumeOff: 'group-data-[volume-level=off]/input-feedback-item:block',
    shownCaptionsOn: 'group-data-captions/input-feedback-item:block',
    shownCaptionsOff: 'group-not-data-captions/input-feedback-item:block',
    value: 'ml-auto',
  },

  bubble: {
    base: cn(
      'group/input-feedback-item',
      // Default placement — center column when no region set
      'col-start-2 row-start-1',
      'flex flex-col items-center justify-center p-4',
      'transition-opacity duration-[250ms] ease-out',
      'data-starting-style:opacity-0',
      'data-ending-style:opacity-0',
      'data-starting-style:duration-[200ms]',
      'data-starting-style:ease-in',
      'data-ending-style:duration-[200ms]',
      'data-ending-style:ease-in',
      '@2xl/media-root:p-8',
      'data-[region=center]:[transition-property:opacity,scale]',
      'data-[region=center]:duration-[600ms]',
      'data-[region=center]:[transition-timing-function:ease-out,linear(0,0.12_1.5%,1.35_9.7%,2.2_13.9%,3_19.9%,2.7_21.8%,0.62_37.5%,0.96_50.9%,1)]',
      'motion-reduce:data-[region=center]:[transition:opacity_100ms_ease-out]',
      'data-[region=center]:data-starting-style:scale-[0.8]',
      'data-[region=center]:data-ending-style:scale-[0.8]',
      'data-[region=center]:data-starting-style:duration-[200ms]',
      'data-[region=center]:data-starting-style:ease-in',
      'data-[region=center]:data-ending-style:duration-[200ms]',
      'data-[region=center]:data-ending-style:ease-in',
      // Region placement
      'data-[region=left]:col-start-1 data-[region=left]:justify-self-start',
      'data-[region=center]:col-start-2',
      'data-[region=right]:col-start-3 data-[region=right]:justify-self-end',
      'data-[region=center]:justify-self-center'
    ),
    icon: 'hidden w-9 h-9',
    shownSeek: cn(
      'group-data-[group=seek]/input-feedback-item:block',
      'group-data-[direction=backward]/input-feedback-item:-scale-x-100',
      // Slide animation (keyframes registered in companion CSS)
      'group-data-active/input-feedback-item:group-data-[action=seekStep]/input-feedback-item:group-data-[direction=forward]/input-feedback-item:animate-media-slide-in-forward',
      'group-data-active/input-feedback-item:group-data-[action=seekStep]/input-feedback-item:group-data-[direction=backward]/input-feedback-item:animate-media-slide-in-backward',
      'motion-reduce:group-data-active/input-feedback-item:group-data-[action=seekStep]/input-feedback-item:animate-none'
    ),
    shownPause: cn(
      'group-data-[group=playback]/input-feedback-item:group-data-paused/input-feedback-item:block',
      'motion-safe:group-data-[group=playback]/input-feedback-item:group-data-paused/input-feedback-item:animate-media-pop-in'
    ),
    shownPlay: cn(
      'group-data-[group=playback]/input-feedback-item:group-not-data-paused/input-feedback-item:block',
      'motion-safe:group-data-[group=playback]/input-feedback-item:group-not-data-paused/input-feedback-item:animate-media-pop-in'
    ),
    time: cn('group-data-value/input-feedback-item:block', 'group-not-data-value/input-feedback-item:hidden'),
  },
};

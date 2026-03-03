import { cn } from '@videojs/utils/style';

/* ==========================================================================
   Atomic Fragments
   ========================================================================== */

export const icon = cn(
  'block [grid-area:1/1] size-4.5',
  'drop-shadow-[0_1px_0_var(--tw-drop-shadow-color)] drop-shadow-black/25',
  'transition-discrete transition-[display,opacity] duration-150 ease-out'
);

export const iconHidden = 'hidden opacity-0';
export const iconFlipped = '[scale:-1_1]';
export const iconContainer = 'relative';

/* ==========================================================================
   Button
   ========================================================================== */

export const button = {
  base: cn(
    'items-center justify-center shrink-0 border-none cursor-pointer select-none text-center',
    'outline-2 outline-transparent -outline-offset-2',
    'font-medium',
    'transition-[background-color,color,outline-offset] duration-150 ease-out',
    'focus-visible:outline-white focus-visible:outline-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-50 disabled:grayscale'
  ),
  icon: cn(
    'grid w-[2.375rem] aspect-square bg-transparent rounded-md',
    'text-white',
    'hover:text-white/80 hover:no-underline',
    'focus-visible:text-white/80',
    'aria-expanded:text-white/80'
  ),
  default: cn('flex py-2 px-4 bg-white rounded-lg', 'text-black'),
};

/* ==========================================================================
   Slider
   ========================================================================== */

export const slider = {
  root: cn(
    'group/slider relative flex flex-1 items-center justify-center rounded-full outline-none',
    // Horizontal
    'data-[orientation=horizontal]:min-w-20 data-[orientation=horizontal]:w-full data-[orientation=horizontal]:h-5',
    // Vertical
    'data-[orientation=vertical]:w-5 data-[orientation=vertical]:h-[4.5rem]'
  ),
  track: cn(
    'relative isolate overflow-hidden bg-white/20 rounded-[inherit]',
    'shadow-[0_0_0_1px_oklch(0_0_0/0.05)] select-none',
    // Horizontal
    'data-[orientation=horizontal]:w-full data-[orientation=horizontal]:h-0.75',
    // Vertical
    'data-[orientation=vertical]:w-0.75 data-[orientation=vertical]:h-full'
  ),
  fill: {
    base: 'absolute rounded-[inherit] pointer-events-none',
    fill: cn(
      'bg-white',
      // Horizontal
      'data-[orientation=horizontal]:inset-y-0 data-[orientation=horizontal]:left-0',
      'data-[orientation=horizontal]:w-(--media-slider-fill,0)',
      // Vertical
      'data-[orientation=vertical]:inset-x-0 data-[orientation=vertical]:bottom-0',
      'data-[orientation=vertical]:h-(--media-slider-fill,0)'
    ),
    buffer: cn(
      'bg-white/20 duration-250 ease-out',
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
      'bg-white rounded-full',
      'ring ring-black/10 shadow-sm shadow-black/15',
      'transition-[opacity,scale,outline-offset] duration-150 ease-out select-none',
      'outline-2 outline-transparent -outline-offset-2',
      'focus-visible:outline-white focus-visible:outline-offset-2',
      // Horizontal
      'data-[orientation=horizontal]:top-1/2 data-[orientation=horizontal]:left-(--media-slider-fill,0)',
      // Vertical
      'data-[orientation=vertical]:left-1/2 data-[orientation=vertical]:top-[calc(100%-var(--media-slider-fill,0))]'
    ),
    interactive: cn(
      'opacity-0 scale-70 origin-center',
      'group-hover/slider:opacity-100 group-hover/slider:scale-100',
      'group-focus-within/slider:opacity-100 group-focus-within/slider:scale-100'
    ),
  },
};

/* ==========================================================================
   Component-Level Compositions
   ========================================================================== */

export const root = cn(
  // Layout & containment
  'block relative isolate overflow-clip @container/media-root',
  // Appearance
  'rounded-(--media-border-radius,0.75rem) bg-black',
  'font-[Inter_Variable,Inter,ui-sans-serif,system-ui,sans-serif] text-[0.8125rem] leading-normal subpixel-antialiased',
  // Resets
  '**:box-border **:m-0',
  '[&_button]:font-[inherit]',
  'motion-safe:[interpolate-size:allow-keywords]',
  // Outer border ring (::after only)
  'after:absolute after:pointer-events-none after:rounded-[inherit] after:z-10',
  'after:inset-0 after:ring-1 after:ring-inset after:ring-black/15',
  'dark:after:ring-white/15',
  // Video element
  '[&>video]:block [&>video]:w-full [&>video]:h-full [&>video]:rounded-[inherit]',
  // Poster image
  '[&>img]:absolute [&>img]:inset-0 [&>img]:w-full [&>img]:h-full [&>img]:rounded-[inherit]',
  '[&>img]:object-cover [&>img]:pointer-events-none',
  '[&>img]:transition-opacity [&>img]:duration-250',
  '[&>img:not([data-visible])]:opacity-0',
  // Caption track CSS variables
  '[--media-caption-track-delay:600ms]',
  '[--media-caption-track-y:-0.5rem]',
  'has-[[data-controls][data-visible]]:[--media-caption-track-delay:25ms]',
  'has-[[data-controls][data-visible]]:[--media-caption-track-y:-3.5rem]',
  // Native caption track container
  '[&_video::-webkit-media-text-track-container]:transition-transform',
  '[&_video::-webkit-media-text-track-container]:duration-150',
  '[&_video::-webkit-media-text-track-container]:ease-out',
  '[&_video::-webkit-media-text-track-container]:delay-(--media-caption-track-delay)',
  '[&_video::-webkit-media-text-track-container]:translate-y-(--media-caption-track-y)',
  '[&_video::-webkit-media-text-track-container]:scale-98',
  '[&_video::-webkit-media-text-track-container]:z-1',
  '[&_video::-webkit-media-text-track-container]:font-[inherit]',
  'motion-reduce:[&_video::-webkit-media-text-track-container]:duration-50',
  // Fullscreen
  '[&:fullscreen]:rounded-none'
);

export const controls = cn(
  // Peer marker for overlay/captions
  'peer/controls',
  // Layout
  'absolute @container/media-controls bottom-0 inset-x-0',
  'pt-8 px-1.5 pb-1.5 flex items-center gap-2',
  'text-white z-10',
  // Transitions
  'will-change-[translate,filter,opacity]',
  'transition-[translate,filter,opacity] ease-out',
  'delay-0 duration-75',
  // Hidden state
  'not-data-visible:opacity-0 not-data-visible:translate-y-full',
  'not-data-visible:blur-sm not-data-visible:pointer-events-none',
  'not-data-visible:delay-500 not-data-visible:duration-500',
  // Reduced motion + hidden
  'motion-reduce:not-data-visible:duration-100',
  'motion-reduce:not-data-visible:translate-y-0',
  'motion-reduce:not-data-visible:blur-none motion-reduce:not-data-visible:scale-100',
  // Wider container
  '@sm/media-root:pt-10 @sm/media-root:px-3 @sm/media-root:pb-3',
  '@sm/media-root:gap-3.5'
);

export const overlay = cn(
  // Layout
  'absolute inset-0 flex flex-col items-start',
  'pointer-events-none rounded-[inherit]',
  // Default: hidden
  'opacity-0',
  'bg-linear-to-t from-black/70 via-black/50 via-[7.5rem] to-transparent',
  'backdrop-blur-none backdrop-saturate-120 backdrop-brightness-90',
  // Transitions
  'transition-[opacity,backdrop-filter] ease-out',
  'duration-500 delay-500',
  // Shown when controls visible
  'peer-data-visible/controls:opacity-100',
  'peer-data-visible/controls:duration-150',
  'peer-data-visible/controls:delay-0',
  // Shown when error visible (+ blur)
  'peer-data-visible/error:opacity-100',
  'peer-data-visible/error:duration-150',
  'peer-data-visible/error:delay-0',
  'peer-data-visible/error:backdrop-blur-sm',
  // Reduced motion
  'motion-reduce:duration-100'
);

export const bufferingIndicator =
  'absolute inset-0 hidden items-center justify-center pointer-events-none z-10 text-white data-visible:flex';

export const error = {
  root: 'peer/error group/error absolute inset-0 z-20 items-center justify-center pointer-events-none hidden data-visible:flex',
  dialog: cn(
    'hidden flex-col gap-3 max-w-64 p-4 text-white text-sm pointer-events-auto',
    'group-data-visible/error:flex',
    'text-shadow-2xs text-shadow-black/50',
    'transition-[display,opacity,scale,transform] duration-500 delay-100 transition-discrete',
    'starting:opacity-0 starting:scale-50',
    'ease-[linear(0,0.034_1.5%,0.763_9.7%,1.066_13.9%,1.198_19.9%,1.184_21.8%,0.963_37.5%,0.997_50.9%,1)]'
  ),
  content: 'flex flex-col gap-2 py-1.5',
  title: 'font-semibold leading-tight',
  actions: 'flex gap-2 *:flex-1',
};

export const buttonGroup = cn('flex items-center gap-[0.075rem]', '@2xl/media-root:gap-0.5');

export const time = {
  group: 'flex items-center gap-1',
  current: cn('hidden tabular-nums text-shadow-2xs text-shadow-black/25', '@md/media-controls:inline'),
  separator: cn('hidden', '@md/media-controls:inline @md/media-controls:text-white/50'),
  duration: cn('tabular-nums text-shadow-2xs text-shadow-black/25', '@md/media-controls:text-white/50'),
  controls: cn('flex flex-row-reverse items-center flex-1 gap-3', '@md/media-controls:flex-row'),
};

export const popup = {
  base: cn(
    // Reset & offset
    'm-0 border-0 bg-transparent [--media-popover-side-offset:0.5rem]',
    // Animation
    'opacity-100 scale-100 origin-bottom blur-none',
    'transition-[transform,scale,opacity,filter] duration-200',
    'data-starting-style:opacity-0 data-starting-style:scale-0 data-starting-style:blur-sm',
    'data-ending-style:opacity-0 data-ending-style:scale-0 data-ending-style:blur-sm',
    'data-instant:duration-0'
  ),
  volume: 'p-1',
};

export const seek = {
  button: '@max-md/media-controls:hidden',
  label: 'text-[0.75em] font-[480] tabular-nums',
  labelForward: 'absolute -right-px -bottom-0.75',
  labelBackward: 'absolute -left-px -bottom-0.75',
};

export const iconState = {
  play: {
    button: 'group',
    restart: 'hidden opacity-0 group-data-ended:block group-data-ended:opacity-100',
    play: 'hidden opacity-0 group-not-data-ended:group-data-paused:block group-not-data-ended:group-data-paused:opacity-100',
    pause:
      'hidden opacity-0 group-not-data-paused:group-not-data-ended:block group-not-data-paused:group-not-data-ended:opacity-100',
  },
  mute: {
    button: 'group',
    volumeOff: 'hidden opacity-0 group-data-muted:block group-data-muted:opacity-100',
    volumeLow:
      'hidden opacity-0 group-not-data-muted:group-data-[volume-level=low]:block group-not-data-muted:group-data-[volume-level=low]:opacity-100',
    volumeHigh:
      'hidden opacity-0 group-not-data-muted:group-not-data-[volume-level=low]:block group-not-data-muted:group-not-data-[volume-level=low]:opacity-100',
  },
  fullscreen: {
    button: 'group',
    enter: 'hidden opacity-0 group-not-data-fullscreen:block group-not-data-fullscreen:opacity-100',
    exit: 'hidden opacity-0 group-data-fullscreen:block group-data-fullscreen:opacity-100',
  },
  captions: {
    button: 'group',
    off: 'hidden opacity-0 group-not-data-active:block group-not-data-active:opacity-100',
    on: 'hidden opacity-0 group-data-active:block group-data-active:opacity-100',
  },
};

export const captions = {
  root: cn(
    'absolute z-20 pointer-events-none text-balance text-base',
    'inset-x-4 bottom-6',
    'transition-transform duration-150 ease-out delay-600',
    'motion-reduce:duration-50',
    // Responsive font sizes
    '@xs/media-root:text-2xl',
    '@3xl/media-root:text-3xl',
    '@7xl/media-root:text-4xl',
    // Shift up when controls visible
    'peer-data-visible/controls:-translate-y-10 peer-data-visible/controls:delay-25'
  ),
  container: 'max-w-[42ch] mx-auto text-center flex flex-col items-center',
  cue: cn(
    'block py-0.5 px-2 text-white text-center whitespace-pre-wrap leading-1.2',
    '[text-shadow:0_0_1px_oklab(0_0_0_/_0.7),0_0_8px_oklab(0_0_0_/_0.7)]',
    'contrast-more:[text-shadow:none] contrast-more:[box-decoration-break:clone] contrast-more:bg-black/70',
    '*:inline'
  ),
};

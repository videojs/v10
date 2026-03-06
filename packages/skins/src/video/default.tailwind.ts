import { cn } from '@videojs/utils/style';

/* ==========================================================================
   Atomic Fragments
   ========================================================================== */

const surface = cn(
  'bg-white/10',
  'backdrop-blur-3xl backdrop-brightness-90 backdrop-saturate-150',
  // Border and shadow
  'ring ring-white/5 ring-inset shadow-sm shadow-black/15',
  // Border to enhance contrast on lighter videos
  'after:absolute after:inset-0 after:ring after:rounded-[inherit] after:ring-black/15 after:pointer-events-none after:z-10',
  // Reduced transparency for users with preference
  '[@media(prefers-reduced-transparency:reduce)]:bg-black/70 [@media(prefers-reduced-transparency:reduce)]:ring-black [@media(prefers-reduced-transparency:reduce)]:after:ring-white/20',
  // High contrast mode
  'contrast-more:bg-black/90 contrast-more:ring-black contrast-more:after:ring-white/20'
);

export const icon = cn(
  'block [grid-area:1/1] size-4.5 shrink-0',
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
    'font-medium',
    'outline-2 outline-transparent -outline-offset-2',
    'transition-[background-color,color,outline-offset] duration-150 ease-out',
    'disabled:cursor-not-allowed disabled:opacity-50 disabled:grayscale',
    'focus-visible:outline-blue-500 focus-visible:outline-offset-2'
  ),
  icon: cn(
    'grid w-[2.125rem] aspect-square bg-transparent rounded-full',
    'text-white/90',
    'text-shadow-2xs text-shadow-black/25',
    'hover:bg-white/10 hover:text-white hover:no-underline',
    'focus-visible:bg-white/10 focus-visible:text-white',
    'aria-expanded:bg-white/10 aria-expanded:text-white'
  ),
  default: cn('flex py-2 px-4 bg-white rounded-full', 'text-black'),
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
    'data-[orientation=vertical]:w-5 data-[orientation=vertical]:h-20'
  ),
  track: cn(
    'relative isolate overflow-hidden bg-white/20 rounded-[inherit]',
    'shadow-[0_0_0_1px_oklch(0_0_0/0.05)] select-none',
    // Horizontal
    'data-[orientation=horizontal]:w-full data-[orientation=horizontal]:h-1',
    // Vertical
    'data-[orientation=vertical]:w-1 data-[orientation=vertical]:h-full'
  ),
  fill: {
    base: 'absolute rounded-[inherit] pointer-events-none',
    fill: cn(
      'bg-white',
      // Horizontal
      'data-[orientation=horizontal]:inset-y-0 data-[orientation=horizontal]:left-0',
      'data-[orientation=horizontal]:w-(--media-slider-fill)',
      // Vertical
      'data-[orientation=vertical]:inset-x-0 data-[orientation=vertical]:bottom-0',
      'data-[orientation=vertical]:h-(--media-slider-fill)'
    ),
    buffer: cn(
      'bg-white/20 duration-250 ease-out',
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
      'bg-white rounded-full',
      'ring ring-black/10 shadow-sm shadow-black/15',
      'transition-[opacity,height,width,outline-offset] duration-150 ease-out select-none',
      'outline-2 outline-transparent -outline-offset-2',
      'focus-visible:outline-blue-500 focus-visible:outline-offset-2',
      // Horizontal
      'data-[orientation=horizontal]:top-1/2 data-[orientation=horizontal]:left-(--media-slider-fill)',
      // Vertical
      'data-[orientation=vertical]:left-1/2 data-[orientation=vertical]:top-[calc(100%-var(--media-slider-fill))]'
    ),
    persistent: 'size-3',
    interactive: cn(
      'size-2.5',
      'opacity-0 focus-visible:opacity-100 group-hover/slider:opacity-100',
      'group-active/slider:size-3'
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
  'rounded-(--media-border-radius,2rem) bg-black',
  'font-[Inter_Variable,Inter,ui-sans-serif,system-ui,sans-serif] text-[0.8125rem] leading-normal subpixel-antialiased',
  // Resets
  '**:box-border **:m-0',
  '[&_button]:font-[inherit]',
  'motion-safe:[interpolate-size:allow-keywords]',
  // Inner highlight ring (::before)
  'before:absolute before:pointer-events-none before:rounded-[inherit] before:z-10',
  'before:inset-px before:ring-1 before:ring-inset before:ring-white/15',
  // Outer border ring (::after)
  'after:absolute after:pointer-events-none after:rounded-[inherit] after:z-10',
  'after:inset-0 after:ring-1 after:ring-inset after:ring-black/10',
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
  // Surface
  surface,
  // Layout
  'absolute @container/media-controls bottom-3 inset-x-3',
  'p-[0.175rem] flex items-center gap-[0.075rem]',
  'text-white rounded-full z-10',
  // Transitions
  'will-change-[scale,transform,filter,opacity]',
  'transition-[scale,transform,filter,opacity] ease-out',
  'delay-0 duration-100 origin-bottom',
  // Hidden state
  'not-data-visible:pointer-events-none not-data-visible:blur-sm',
  'not-data-visible:scale-90 not-data-visible:opacity-0',
  'not-data-visible:delay-500 not-data-visible:duration-300',
  // Reduced motion + hidden
  'motion-reduce:not-data-visible:duration-100',
  'motion-reduce:not-data-visible:blur-none',
  'motion-reduce:not-data-visible:scale-100',
  // Wider container
  '@2xl/media-root:p-1 @2xl/media-root:gap-0.5'
);

export const overlay = cn(
  // Layout
  'absolute inset-0 flex flex-col items-start',
  'pointer-events-none rounded-[inherit]',
  // Default: hidden
  'opacity-0',
  'bg-linear-to-t from-black/50 via-black/30 to-transparent',
  'backdrop-blur-none backdrop-saturate-120 backdrop-brightness-90',
  // Transitions
  'transition-[opacity,backdrop-filter] ease-out',
  'duration-300 delay-500',
  // Shown when controls visible
  'peer-data-visible/controls:opacity-100',
  'peer-data-visible/controls:duration-150',
  'peer-data-visible/controls:delay-0',
  // Shown when error visible (+ blur)
  'peer-data-open/error:opacity-100',
  'peer-data-open/error:duration-150',
  'peer-data-open/error:delay-0',
  'peer-data-open/error:backdrop-blur-sm',
  // Reduced motion
  'motion-reduce:duration-100'
);

export const bufferingIndicator = {
  root: 'absolute inset-0 hidden items-center justify-center pointer-events-none z-10 text-white data-visible:flex',
  container: cn('p-1 rounded-full', surface),
};

export const error = {
  root: 'peer/error group/error absolute inset-0 z-20 flex items-center justify-center pointer-events-none',
  dialog: cn(
    'flex flex-col gap-3 max-w-72 p-3 rounded-[1.75rem] text-white text-sm pointer-events-auto',
    'transition-[opacity,transform] duration-500 delay-100',
    'ease-[linear(0,0.034_1.5%,0.763_9.7%,1.066_13.9%,1.198_19.9%,1.184_21.8%,0.963_37.5%,0.997_50.9%,1)]',
    'group-data-[starting-style]/error:opacity-0 group-data-[starting-style]/error:scale-50',
    'group-data-[ending-style]/error:opacity-0 group-data-[ending-style]/error:scale-50',
    surface
  ),
  content: 'flex flex-col gap-2 px-2 pt-2 pb-1.5',
  title: 'font-semibold leading-tight',
  description: 'opacity-70',
  actions: 'flex gap-2 *:flex-1',
};

export const time = {
  group: '@container/media-time flex items-center flex-1 gap-3 px-2',
  current: 'hidden @2xs/media-time:block text-shadow-2xs text-shadow-black/25 tabular-nums',
  duration: 'text-shadow-2xs text-shadow-black/25 tabular-nums',
};

export const popup = {
  base: cn(
    // Reset & offset
    'm-0 border-0 [--media-popover-side-offset:0.5rem]',
    // Surface
    surface,
    // Animation
    'opacity-100 scale-100 origin-bottom blur-none',
    'transition-[transform,scale,opacity,filter] duration-200',
    'data-starting-style:opacity-0 data-starting-style:scale-0 data-starting-style:blur-sm',
    'data-ending-style:opacity-0 data-ending-style:scale-0 data-ending-style:blur-sm',
    'data-instant:duration-0'
  ),
  volume: 'py-2.5 px-1 rounded-full',
};

export const seek = {
  button: '@max-md/media-controls:hidden',
  label: 'text-[0.75em] font-[480] tabular-nums',
  labelForward: 'absolute -right-px -bottom-0.75',
  labelBackward: 'absolute -left-px -bottom-0.75',
};

export const playbackRate = {
  button: `after:content-[attr(data-rate)_'×'] after:w-[4ch] after:tabular-nums`,
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
    'peer-data-visible/controls:-translate-y-12 peer-data-visible/controls:delay-25'
  ),
  container: 'max-w-[42ch] mx-auto text-center flex flex-col items-center',
  cue: cn(
    'block py-0.5 px-2 text-white text-center whitespace-pre-wrap leading-1.2',
    '[text-shadow:0_0_1px_oklab(0_0_0_/_0.7),0_0_8px_oklab(0_0_0_/_0.7)]',
    'contrast-more:[text-shadow:none] contrast-more:[box-decoration-break:clone] contrast-more:bg-black/70',
    '*:inline'
  ),
};

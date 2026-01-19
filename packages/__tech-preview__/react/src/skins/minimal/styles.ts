import type { MinimalSkinStyles } from './types';

// NOTE: Removing import to sidestep for compiler complexity (CJP)
// import { cn } from '../../utils/cn';
// A (very crude) utility to merge class names
// Usually I'd use something like `clsx` or `classnames` but this is ok for our simple use case.
// It just makes the billions of Tailwind classes a little easier to read.
function cn(...classes: (string | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

const styles: MinimalSkinStyles = {
  MediaContainer: cn(
    'vjs', // Scope preflight
    'vjs:relative vjs:isolate vjs:@container/root vjs:group/root vjs:overflow-clip vjs:bg-black vjs:rounded-(--minimal-border-radius,0.75rem)',
    // Base typography
    'vjs:font-sans vjs:text-[0.8125rem] vjs:subpixel-antialiased',
    // Fancy borders
    'vjs:after:absolute vjs:after:inset-0 vjs:after:ring-black/15 vjs:after:ring-1 vjs:dark:after:ring-white/15 vjs:after:ring-inset vjs:after:z-10 vjs:after:pointer-events-none vjs:after:rounded-[inherit]',
    // Prevent rounded corners in fullscreen
    'vjs:[&:fullscreen]:rounded-none',
    // Ensure the nested video inherits the radius
    'vjs:[&_video]:w-full vjs:[&_video]:h-full',
  ),
  Overlay: cn(
    'vjs:absolute vjs:inset-0 vjs:rounded-[inherit] vjs:pointer-events-none',
    'vjs:bg-linear-to-t vjs:from-black/70 vjs:via-black/50 vjs:via-[7.5rem] vjs:to-transparent',
    // High contrast mode
    'vjs:contrast-more:from-black/75',
    // Animation
    'vjs:transition vjs:will-change-[opacity] vjs:ease-out',
    // No delay and faster duration when showing
    'vjs:delay-0 vjs:duration-75',
    // Hidden state
    'vjs:group-data-[controls=hidden]/root:delay-500 vjs:group-data-[controls=hidden]/root:duration-500 vjs:group-data-[controls=hidden]/root:opacity-0',
  ),
  Controls: cn(
    'vjs:@container/controls vjs:absolute vjs:inset-x-0 vjs:bottom-0 vjs:flex vjs:items-center vjs:gap-2 vjs:z-20 vjs:px-1.5 vjs:pb-1.5 vjs:pt-8 vjs:text-white',
    // Animation
    'vjs:transition vjs:will-change-[transform,filter,opacity] vjs:ease-out',
    // No delay and faster duration when showing
    'vjs:delay-0 vjs:duration-75',
    // Hidden state
    'vjs:group-data-[controls=hidden]/root:translate-y-full vjs:group-data-[controls=hidden]/root:opacity-0 vjs:group-data-[controls=hidden]/root:blur-sm vjs:group-data-[controls=hidden]/root:delay-500 vjs:group-data-[controls=hidden]/root:duration-500 vjs:group-data-[controls=hidden]/root:pointer-events-none',
    // Looser spacing on larger screens
    'vjs:@sm/root:gap-3.5 vjs:@sm/root:px-3 vjs:@sm/root:pb-3 vjs:@sm/root:pt-10',
  ),
  Icon: cn('icon vjs:[&_path]:transition-transform vjs:[&_path]:ease-out'),
  TimeDisplayGroup: cn('flex items-center gap-1'),
  Button: cn(
    'vjs:group/button vjs:cursor-pointer vjs:relative vjs:shrink-0 vjs:transition-[color,background,outline-offset] vjs:select-none vjs:p-2.5 vjs:rounded-md',
    // Background/foreground
    'vjs:bg-transparent vjs:text-white',
    // Hover and focus states
    'vjs:hover:text-white/80 vjs:focus-visible:text-white/80',
    // Focus state
    'vjs:-outline-offset-2 vjs:focus-visible:outline-2 vjs:focus-visible:outline-offset-2 vjs:focus-visible:outline-white',
    // Disabled state
    'vjs:disabled:grayscale vjs:disabled:opacity-50 vjs:disabled:cursor-not-allowed',
    // Loading state
    'vjs:aria-busy:pointer-events-none vjs:aria-busy:cursor-not-allowed',
    // Expanded state
    'vjs:aria-expanded:text-white/80',
  ),
  ButtonGroup: cn('vjs:flex vjs:items-center vjs:gap-1.5'),
  IconButton: cn(
    'vjs:grid vjs:[&_.icon]:[grid-area:1/1]',
    'vjs:[&_.icon]:shrink-0 vjs:[&_.icon]:transition-opacity vjs:[&_.icon]:duration-150 vjs:[&_.icon]:ease-linear vjs:[&_.icon]:drop-shadow-[0_1px_0_var(--tw-shadow-color)] vjs:[&_.icon]:shadow-black/40',
  ),
  PlayIcon: cn('vjs:opacity-0 vjs:group-data-paused/button:opacity-100'),
  PauseIcon: cn('vjs:group-data-paused/button:opacity-0'),
  PlayTooltipPopup: cn(
    'vjs:[&_.pause-tooltip]:inline vjs:data-paused:[&_.pause-tooltip]:hidden',
    'vjs:[&_.play-tooltip]:hidden vjs:data-paused:[&_.play-tooltip]:inline',
  ),
  PlayTooltip: cn('play-tooltip'),
  PauseTooltip: cn('pause-tooltip'),
  VolumeHighIcon: cn('vjs:hidden vjs:group-data-[volume-level=high]/button:inline vjs:group-data-[volume-level=medium]/button:inline'),
  VolumeLowIcon: cn('vjs:hidden vjs:group-data-[volume-level=low]/button:inline'),
  VolumeOffIcon: cn('vjs:hidden vjs:group-data-[volume-level=off]/button:inline'),
  FullscreenEnterIcon: cn(
    'vjs:group-data-fullscreen/button:hidden',
    'vjs:group-hover/button:[&_.arrow-1]:translate-x-px vjs:group-hover/button:[&_.arrow-1]:-translate-y-px',
    'vjs:group-hover/button:[&_.arrow-2]:-translate-x-px vjs:group-hover/button:[&_.arrow-2]:translate-y-px',
  ),
  FullscreenExitIcon: cn(
    'vjs:hidden vjs:group-data-fullscreen/button:inline',
    'vjs:[&_.arrow-1]:translate-x-px vjs:[&_.arrow-1]:-translate-y-px',
    'vjs:[&_.arrow-2]:-translate-x-px vjs:[&_.arrow-2]:translate-y-px',
    'vjs:group-hover/button:[&_.arrow-1]:translate-0',
    'vjs:group-hover/button:[&_.arrow-2]:translate-0',
  ),
  FullscreenTooltipPopup: cn(
    'vjs:[&_.fullscreen-enter-tooltip]:inline vjs:data-fullscreen:[&_.fullscreen-enter-tooltip]:hidden',
    'vjs:[&_.fullscreen-exit-tooltip]:hidden vjs:data-fullscreen:[&_.fullscreen-exit-tooltip]:inline',
  ),
  FullscreenEnterTooltip: cn('fullscreen-enter-tooltip'),
  FullscreenExitTooltip: cn('fullscreen-exit-tooltip'),
  TimeSliderRoot: cn('vjs:mx-2'),
  TimeDisplay: cn('vjs:tabular-nums vjs:text-shadow-2xs/20'),
  DurationDisplay: cn('vjs:text-white/50 vjs:contents'),
  SliderRoot: cn(
    'vjs:group/slider vjs:outline-0 vjs:flex vjs:items-center vjs:justify-center vjs:flex-1 vjs:group/slider vjs:relative vjs:rounded-full',
    'vjs:data-[orientation=horizontal]:h-5 vjs:data-[orientation=horizontal]:min-w-20',
    'vjs:data-[orientation=vertical]:w-5 vjs:data-[orientation=vertical]:h-18',
  ),
  SliderTrack: cn(
    'vjs:relative vjs:select-none vjs:rounded-[inherit] vjs:bg-white/10',
    'vjs:data-[orientation=horizontal]:w-full vjs:data-[orientation=horizontal]:h-0.75',
    'vjs:data-[orientation=vertical]:w-0.75',
    'vjs:-outline-offset-2 vjs:group-focus-visible/slider:outline-2 vjs:group-focus-visible/slider:outline-offset-6 vjs:group-focus-visible/slider:outline-white',
  ),
  SliderProgress: cn('vjs:bg-white vjs:rounded-[inherit]'),
  SliderPointer: cn('vjs:hidden'),
  SliderThumb: cn(
    'vjs:bg-white vjs:z-10 vjs:size-3 vjs:select-none vjs:ring vjs:ring-black/10 vjs:rounded-full vjs:shadow-sm vjs:shadow-black/15 vjs:transition-[opacity,scale] vjs:ease-out vjs:opacity-0 vjs:scale-70 vjs:origin-center',
    'vjs:group-hover/slider:opacity-100 vjs:group-hover/slider:scale-100',
    'vjs:data-[orientation=horizontal]:hover:cursor-ew-resize',
    'vjs:data-[orientation=vertical]:hover:cursor-ns-resize',
  ),
  PopupAnimation: cn(
    // Animation
    // XXX: We can't use transforms since floating UI uses them for positioning.
    'vjs:transition-[transform,scale,opacity,filter] vjs:origin-bottom vjs:duration-200 vjs:data-instant:duration-0',
    'vjs:data-starting-style:scale-0 vjs:data-starting-style:opacity-0 vjs:data-starting-style:blur-sm',
    'vjs:data-ending-style:scale-0 vjs:data-ending-style:opacity-0 vjs:data-ending-style:blur-sm',
  ),
  PopoverPopup: cn('vjs:py-2 vjs:bg-transparent'),
  TooltipPopup: cn(
    'vjs:whitespace-nowrap vjs:flex vjs:flex-col vjs:rounded vjs:text-white vjs:text-xs vjs:@7xl/root:text-sm vjs:px-2 vjs:py-1 vjs:bg-white/20 vjs:backdrop-blur-3xl vjs:backdrop-saturate-150 vjs:backdrop-brightness-90 vjs:shadow-md vjs:shadow-black/5',
  ),
};

export default styles;

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
    'relative @container/root group/root overflow-clip bg-black',
    // Base typography
    'text-[0.8125rem]', // 13px
    // 'ring-1 ring-inset ring-black/10 dark:ring-white/10',
    'after:absolute after:inset-0 after:ring-black/10 after:ring-1 dark:after:ring-white/10 after:ring-inset after:z-10 after:pointer-events-none after:rounded-[inherit]',
    // Prevent rounded corners in fullscreen.
    '[&:fullscreen]:rounded-none [&:fullscreen]:[&_video]:h-full [&:fullscreen]:[&_video]:w-full',
    // Ensure the nested video inherits the radius.
    '[&_video]:rounded-[inherit] [&_video]:w-full [&_video]:h-auto',
  ),
  Overlay: cn(
    'absolute inset-0 rounded-[inherit] bg-black/30',
    'bg-gradient-to-t from-black/30 to-transparent to-[120px]',
    'opacity-0 delay-500 duration-300',
    //  FIXME: Temporary hide/show logic
    'has-[+.controls_[data-paused]]:opacity-100 has-[+.controls_[data-paused]]:delay-0 has-[+.controls_[data-paused]]:duration-75',
    'group-hover/root:opacity-100 group-hover/root:delay-0 group-hover/root:duration-75',
  ),
  Controls: cn(
    'controls', //  FIXME: Temporary className hook for above logic in the overlay. Can be removed once have a proper way to handle controls visibility.
    '@container/controls absolute inset-x-0 bottom-0 flex items-center gap-3.5 z-20 px-6 pb-6 pt-10 text-white text-shadow',
    'shadow-sm shadow-black/15',
    // Animation
    'transition ease-in-out',
    //  FIXME: Temporary hide/show logic
    'translate-y-full opacity-0 delay-500 duration-300',
    'has-[[data-paused]]:translate-y-0 has-[[data-paused]]:opacity-100 has-[[data-paused]]:delay-0 has-[[data-paused]]:duration-75',
    'group-hover/root:translate-y-0 group-hover/root:opacity-100 group-hover/root:delay-0 group-hover/root:duration-75',
  ),
  Icon: cn('icon'),
  Button: cn(
    'group/button cursor-pointer relative shrink-0 transition select-none p-2 rounded-md',
    // Background/foreground
    'bg-transparent text-white',
    // Hover and focus states
    'hover:text-white/70 focus-visible:text-white/70',
    // Focus state
    '-outline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
    // Disabled state
    'aria-disabled:grayscale aria-disabled:opacity-50 aria-disabled:cursor-not-allowed',
    // Loading state
    'aria-busy:pointer-events-none aria-busy:cursor-not-allowed',
    // Expanded state
    'aria-expanded:text-white/70',
    // Pressed state
    'active:scale-95',
  ),
  ButtonGroup: cn('flex items-center gap-1.5'),
  IconButton: cn(
    'grid [&_.icon]:[grid-area:1/1]',
    '[&_.icon]:shrink-0 [&_.icon]:transition [&_.icon]:duration-300 [&_.icon]:ease-out [&_.icon]:drop-shadow-[0_1px_0_var(--tw-shadow-color)] [&_.icon]:shadow-black/20',
  ),
  PlayButton: cn(
    '[&_.pause-icon]:opacity-100 [&[data-paused]_.pause-icon]:opacity-0',
    '[&_.play-icon]:opacity-0 [&[data-paused]_.play-icon]:opacity-100',
  ),
  PlayIcon: cn('play-icon'),
  PauseIcon: cn('pause-icon'),
  MuteButton: cn(
    '[&_.icon]:hidden',
    '[&[data-volume-level="high"]_.volume-high-icon]:inline',
    '[&[data-volume-level="medium"]_.volume-low-icon]:inline',
    '[&[data-volume-level="low"]_.volume-low-icon]:inline',
    '[&[data-volume-level="off"]_.volume-off-icon]:inline',
  ),
  VolumeHighIcon: cn('volume-high-icon'),
  VolumeLowIcon: cn('volume-low-icon'),
  VolumeOffIcon: cn('volume-off-icon'),
  FullscreenButton: cn(
    '[&_.fullscreen-enter-icon]:opacity-100 [&[data-fullscreen]_.fullscreen-enter-icon]:opacity-0',
    '[&_.fullscreen-exit-icon]:opacity-0 [&[data-fullscreen]_.fullscreen-exit-icon]:opacity-100',
    '[&_path]:transition-transform ease-out',
  ),
  FullscreenEnterIcon: cn(
    'fullscreen-enter-icon',
    'group-hover/button:[&_.arrow-1]:-translate-x-px group-hover/button:[&_.arrow-1]:-translate-y-px',
    'group-hover/button:[&_.arrow-2]:translate-x-px group-hover/button:[&_.arrow-2]:translate-y-px',
  ),
  FullscreenExitIcon: cn(
    'fullscreen-exit-icon',
    '[&_.arrow-1]:-translate-x-px [&_.arrow-1]:-translate-y-px',
    '[&_.arrow-2]:translate-x-px [&_.arrow-2]:translate-y-px',
    'group-hover/button:[&_.arrow-1]:translate-0',
    'group-hover/button:[&_.arrow-2]:translate-0',
  ),
  TimeSliderRoot: cn('mx-2'),
  TimeSliderThumb: cn('opacity-0'),
  TimeDisplay: cn('tabular-nums text-shadow-2xs shadow-black/50'),
  SliderRoot: cn(
    'flex items-center justify-center flex-1 group/slider relative',
    '[&[data-orientation="horizontal"]]:h-5 [&[data-orientation="horizontal"]]:min-w-20',
    '[&[data-orientation="vertical"]]:w-5 [&[data-orientation="vertical"]]:h-20',
  ),
  SliderTrack: cn(
    'relative select-none rounded-full bg-white/10',
    '[&[data-orientation="horizontal"]]:w-full [&[data-orientation="horizontal"]]:h-1',
    '[&[data-orientation="vertical"]]:w-1',
  ),
  SliderProgress: cn('bg-white rounded-[inherit]'),
  SliderPointer: cn('hidden'),
  SliderThumb: cn(
    'bg-white z-10 select-none ring ring-black/10 rounded-full shadow-sm shadow-black/15 transition-[opacity,height,width] ease-in-out',
    '-outline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500',
    'size-3 active:size-3.5 group-active/slider:size-3.5 hover:cursor-ew-resize',
  ),
};

export default styles;

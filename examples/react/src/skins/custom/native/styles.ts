import type { CustomNativeSkinStyles } from './types';

// NOTE: Removing import to sidestep for compiler complexity (CJP)
// import { cn } from '../../utils/cn';
// A (very crude) utility to merge class names
// Usually I'd use something like `clsx` or `classnames` but this is ok for our simple use case.
// It just makes the billions of Tailwind classes a little easier to read.
function cn(...classes: (string | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

const styles: CustomNativeSkinStyles = {
  MediaContainer: cn(
    'relative isolate @container/root group/root overflow-clip bg-black rounded-xl',
    // Base typography
    'font-sans text-[0.8125rem] subpixel-antialiased',
    // Fancy borders
    'after:absolute after:inset-0 after:ring-black/10 after:ring-1 dark:after:ring-white/10 after:ring-inset after:z-10 after:pointer-events-none after:rounded-[inherit]',
    // Prevent rounded corners in fullscreen
    '[&:fullscreen]:rounded-none',
    // Ensure the nested video inherits the radius
    '[&_video]:w-full [&_video]:h-full',
  ),
  Controls: cn(
    '@container/controls absolute inset-x-0 bottom-0 top-1/3 flex flex-col justify-end z-20 px-2.5 pb-2.5 text-white text-shadow',
    'shadow-sm shadow-black/15',
    // Background
    'bg-linear-to-t from-stone-950/70 via-stone-950/60 via-35% to-transparent',
    // Animation
    'transition ease-in-out',
    //  FIXME: Temporary hide/show logic
    'translate-y-full opacity-0 delay-500 pointer-events-none',
    'has-data-paused:translate-y-0 has-data-paused:opacity-100 has-data-paused:delay-0 has-data-paused:pointer-events-auto',
    'group-hover/root:translate-y-0 group-hover/root:opacity-100 group-hover/root:delay-0 group-hover/root:pointer-events-auto',
  ),
  ControlsRow: cn('flex items-center justify-between'),
  Button: cn(
    'group/button cursor-pointer relative shrink-0 transition select-none p-2 rounded-md',
    // Background/foreground
    'bg-transparent text-white/90',
    // Hover and focus states
    'hover:no-underline hover:bg-stone-100/10 hover:backdrop-blur-md hover:text-white focus-visible:no-underline focus-visible:bg-stone-100/10 focus-visible:text-white',
    // Focus state
    '-outline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500',
    // Disabled state
    'aria-disabled:grayscale aria-disabled:opacity-50 aria-disabled:cursor-not-allowed',
    // Loading state
    'aria-busy:pointer-events-none aria-busy:cursor-not-allowed',
    // Expanded state
    'aria-expanded:bg-stone-100/10 aria-expanded:text-white',
    // Pressed state
    'active:scale-95',
  ),
  IconButton: cn(
    'grid [&_svg]:[grid-area:1/1]',
    '[&_svg]:shrink-0 [&_svg]:transition [&_svg]:duration-300 [&_svg]:ease-out [&_svg]:drop-shadow-[0_1px_0_var(--tw-shadow-color)] [&_svg]:shadow-black/20',
  ),
  PlayButton: cn(
    '[&_.pause-icon]:opacity-100 [&[data-paused]_.pause-icon]:opacity-0',
    '[&_.play-icon]:opacity-0 [&[data-paused]_.play-icon]:opacity-100',
  ),
  PlayIcon: cn('play-icon'),
  PauseIcon: cn('pause-icon'),
  VolumeControls: cn('flex items-center flex-row-reverse group/volume'),
  VolumeSlider: cn(
    'w-0 px-3 overflow-hidden pointer-events-none transition-[opacity,width] opacity-0 ease-out delay-500',
    'group-hover/volume:w-28 group-hover/volume:pointer-events-auto group-hover/volume:opacity-100 group-hover/volume:delay-0',
    'group-focus-within/volume:w-28 group-focus-within/volume:pointer-events-auto group-focus-within/volume:opacity-100 group-focus-within/volume:delay-0',
  ),
  VolumeButton: cn(
    '[&_svg]:hidden',
    '[&[data-volume-level="high"]_.volume-high-icon]:inline',
    '[&[data-volume-level="medium"]_.volume-low-icon]:inline',
    '[&[data-volume-level="low"]_.volume-low-icon]:inline',
    '[&[data-volume-level="off"]_.volume-off-icon]:inline',
  ),
  VolumeHighIcon: cn('volume-high-icon'),
  VolumeLowIcon: cn('volume-low-icon'),
  VolumeOffIcon: cn('volume-off-icon'),
  FullScreenButton: cn(
    '[&_.fullscreen-enter-icon]:opacity-100 [&[data-fullscreen]_.fullscreen-enter-icon]:opacity-0',
    '[&_.fullscreen-exit-icon]:opacity-0 [&[data-fullscreen]_.fullscreen-exit-icon]:opacity-100',
    '[&_path]:transition-transform ease-out',
  ),
  FullScreenEnterIcon: cn(
    'fullscreen-enter-icon',
    'group-hover/button:[&_.arrow-1]:-translate-x-px group-hover/button:[&_.arrow-1]:-translate-y-px',
    'group-hover/button:[&_.arrow-2]:translate-x-px group-hover/button:[&_.arrow-2]:translate-y-px',
  ),
  FullScreenExitIcon: cn(
    'fullscreen-exit-icon',
    '[&_.arrow-1]:-translate-x-px [&_.arrow-1]:-translate-y-px',
    '[&_.arrow-2]:translate-x-px [&_.arrow-2]:translate-y-px',
    'group-hover/button:[&_.arrow-1]:translate-0',
    'group-hover/button:[&_.arrow-2]:translate-0',
  ),
  TimeSliderThumb: cn(
    'opacity-0',
    'group-hover/slider:opacity-100 group-focus-within/slider:opacity-100',
  ),
  TimeDisplay: cn('tabular-nums text-shadow-2xs shadow-black/50'),
  SliderRoot: cn(
    'flex items-center justify-center flex-1 group/slider relative',
    '[&[data-orientation="horizontal"]]:h-5 [&[data-orientation="horizontal"]]:min-w-20',
    '[&[data-orientation="vertical"]]:w-5 [&[data-orientation="vertical"]]:h-20',
  ),
  SliderTrack: cn(
    'relative select-none rounded-full bg-white/25 backdrop-blur-sm backdrop-brightness-90 backdrop-saturate-150 shadow-sm shadow-black/10',
    '[&[data-orientation="horizontal"]]:w-full [&[data-orientation="horizontal"]]:h-1',
    '[&[data-orientation="vertical"]]:w-1',
  ),
  SliderProgress: cn('bg-amber-500 rounded-[inherit]'),
  // TODO: Work out what we want to do here.
  SliderPointer: cn('rounded-[inherit]'),
  SliderThumb: cn(
    'bg-white z-10 select-none ring ring-black/10 rounded-full shadow-sm shadow-black/15 transition-[opacity,height,width] ease-in-out',
    '-outline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500',
    'size-3 active:size-3.5 group-active/slider:size-3.5 hover:cursor-ew-resize',
  ),
};

export default styles;

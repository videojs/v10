import type { FrostedSkinStyles } from './types';

// NOTE: Removing import to sidestep for compiler complexity (CJP)
// import { cn } from '../../utils/cn';
// A (very crude) utility to merge class names
// Usually I'd use something like `clsx` or `classnames` but this is ok for our simple use case.
// It just makes the billions of Tailwind classes a little easier to read.
function cn(...classes: (string | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

const styles: FrostedSkinStyles = {
  MediaContainer: cn(
    'vjs', // Scope preflight
    'vjs:relative vjs:isolate vjs:@container/root vjs:group/root vjs:overflow-clip vjs:bg-black vjs:rounded-(--vjs-border-radius,2rem)',
    // Base typography
    'vjs:text-[0.8125rem]',
    // Fancy borders
    'vjs:after:absolute vjs:after:inset-0 vjs:after:ring-black/10 vjs:after:ring-1 vjs:dark:after:ring-white/10 vjs:after:ring-inset vjs:after:z-10 vjs:after:pointer-events-none vjs:after:rounded-[inherit]',
    'vjs:before:absolute vjs:before:inset-px vjs:before:rounded-[inherit] vjs:before:ring-white/15 vjs:before:ring-1 vjs:before:ring-inset vjs:before:z-10 vjs:before:pointer-events-none vjs:dark:before:ring-0',
    // Prevent rounded corners in fullscreen
    'vjs:[&:fullscreen]:rounded-none',
    // Ensure the nested video inherits the radius
    'vjs:[&_video]:w-full vjs:[&_video]:h-full',
  ),
  Overlay: cn(
    'vjs:opacity-0 vjs:delay-500 vjs:duration-300 vjs:rounded-[inherit] vjs:absolute vjs:inset-0 vjs:pointer-events-none vjs:bg-gradient-to-t vjs:from-black/50 vjs:via-black/20 vjs:to-transparent vjs:transition-opacity vjs:backdrop-saturate-150 vjs:backdrop-brightness-90',
    // ------------------------------------
    //  FIXME: This is crude temporary logic, we'll improve it later I guess with a [data-show-controls] attribute or something?
    'vjs:has-[+.controls_[data-paused]]:opacity-100 vjs:has-[+.controls_[data-paused]]:delay-0 vjs:has-[+.controls_[data-paused]]:duration-100',
    'vjs:has-[+.controls_[aria-expanded="true"]]:opacity-100 vjs:has-[+.controls_[aria-expanded="true"]]:delay-0 vjs:has-[+.controls_[aria-expanded="true"]]:duration-100',
    'vjs:group-hover/root:opacity-100 vjs:group-hover/root:delay-0 vjs:group-hover/root:duration-100',
    // ------------------------------------
  ),
  Surface: cn(
    'vjs:bg-white/10 vjs:backdrop-blur-3xl vjs:backdrop-saturate-150 vjs:backdrop-brightness-90',
    // Ring and shadow
    'vjs:ring vjs:ring-white/10 vjs:ring-inset vjs:shadow-sm vjs:shadow-black/15',
    // Border to enhance contrast on lighter videos
    'vjs:after:absolute vjs:after:inset-0 vjs:after:ring vjs:after:rounded-[inherit] vjs:after:ring-black/15 vjs:after:pointer-events-none vjs:after:z-10',
    // Reduced transparency for users with preference
    // XXX: This requires a Tailwind custom variant (see 1 below)
    'vjs:reduced-transparency:bg-black/70 vjs:reduced-transparency:ring-black vjs:reduced-transparency:after:ring-white/20',
    // High contrast mode
    'vjs:contrast-more:bg-black/90 vjs:contrast-more:ring-black vjs:contrast-more:after:ring-white/20',
  ),
  Controls: cn(
    // ------------------------------------
    //  FIXME: Temporary className hook for above logic in the overlay. Can be removed once have a proper way to handle controls visibility.
    'controls',
    // ------------------------------------
    'vjs:@container/controls vjs:absolute vjs:inset-x-3 vjs:bottom-3 vjs:rounded-full vjs:flex vjs:items-center vjs:p-1 vjs:gap-0.5 vjs:text-white',
    // Animation
    'vjs:transition vjs:will-change-[transform,scale,filter,opacity] vjs:origin-bottom vjs:ease-out',
    // ------------------------------------
    //  FIXME: Temporary hide/show logic, related to above.
    'vjs:scale-90 vjs:opacity-0 vjs:blur-sm vjs:delay-500 vjs:duration-300',
    'vjs:has-[[data-paused]]:scale-100 vjs:has-[[data-paused]]:opacity-100 vjs:has-[[data-paused]]:blur-none vjs:has-[[data-paused]]:delay-0 vjs:has-[[data-paused]]:duration-100',
    'vjs:has-[[aria-expanded="true"]]:scale-100 vjs:has-[[aria-expanded="true"]]:opacity-100 vjs:has-[[aria-expanded="true"]]:blur-none vjs:has-[[aria-expanded="true"]]:delay-0 vjs:has-[[aria-expanded="true"]]:duration-100',
    'vjs:group-hover/root:scale-100 vjs:group-hover/root:opacity-100 vjs:group-hover/root:blur-none vjs:group-hover/root:delay-0 vjs:group-hover/root:duration-100',
    // ------------------------------------
  ),
  Icon: cn('icon vjs:[&_path]:transition-transform vjs:[&_path]:ease-out'),
  Button: cn(
    'vjs:group/button vjs:cursor-pointer vjs:relative vjs:shrink-0 vjs:transition-[color,background,outline-offset] vjs:select-none vjs:p-2 vjs:rounded-full',
    // Background/foreground
    'vjs:bg-transparent vjs:text-white/90',
    // Hover and focus states
    'vjs:hover:no-underline vjs:hover:bg-white/10 vjs:hover:text-white vjs:focus-visible:no-underline vjs:focus-visible:bg-white/10 vjs:focus-visible:text-white',
    // Focus state
    'vjs:-outline-offset-2 vjs:focus-visible:outline-2 vjs:focus-visible:outline-offset-2 vjs:focus-visible:outline-blue-500',
    // Disabled state
    'vjs:disabled:grayscale vjs:disabled:opacity-50 vjs:disabled:cursor-not-allowed',
    // Loading state
    'vjs:aria-busy:pointer-events-none vjs:aria-busy:cursor-not-allowed',
    // Expanded state
    'vjs:aria-expanded:bg-white/10 vjs:aria-expanded:text-white',
  ),
  IconButton: cn(
    'vjs:grid vjs:[&_.icon]:[grid-area:1/1]',
    'vjs:[&_.icon]:shrink-0 vjs:[&_.icon]:transition-opacity vjs:[&_.icon]:duration-150 vjs:[&_.icon]:ease-linear vjs:[&_.icon]:drop-shadow-[0_1px_0_var(--tw-shadow-color)] vjs:[&_.icon]:shadow-black/25',
  ),
  PlayIcon: cn('vjs:opacity-0 vjs:group-data-paused/button:opacity-100'),
  PauseIcon: cn('vjs:group-data-paused/button:opacity-0'),
  PlayTooltipPopup: cn(
    'vjs:[&_.pause-tooltip]:inline vjs:[&_.play-tooltip]:hidden',
    'vjs:data-paused:[&_.pause-tooltip]:hidden vjs:data-paused:[&_.play-tooltip]:inline',
  ),
  PlayTooltip: cn('play-tooltip'),
  PauseTooltip: cn('pause-tooltip'),
  VolumeHighIcon: cn('vjs:hidden vjs:group-data-[volume-level=high]/button:inline vjs:group-data-[volume-level=medium]/button:inline'),
  VolumeLowIcon: cn('vjs:hidden vjs:group-data-[volume-level=low]/button:inline'),
  VolumeOffIcon: cn('vjs:hidden vjs:group-data-[volume-level=off]/button:inline'),
  FullscreenEnterIcon: cn(
    'vjs:group-data-fullscreen/button:hidden',
    'vjs:group-hover/button:[&_.arrow-1]:-translate-x-px vjs:group-hover/button:[&_.arrow-1]:-translate-y-px',
    'vjs:group-hover/button:[&_.arrow-2]:translate-x-px vjs:group-hover/button:[&_.arrow-2]:translate-y-px',
  ),
  FullscreenExitIcon: cn(
    'vjs:hidden vjs:group-data-fullscreen/button:inline',
    'vjs:[&_.arrow-1]:-translate-x-px vjs:[&_.arrow-1]:-translate-y-px',
    'vjs:[&_.arrow-2]:translate-x-px vjs:[&_.arrow-2]:translate-y-px',
    'vjs:group-hover/button:[&_.arrow-1]:translate-0',
    'vjs:group-hover/button:[&_.arrow-2]:translate-0',
  ),
  FullscreenTooltipPopup: cn(
    'vjs:[&_.fullscreen-enter-tooltip]:inline vjs:data-fullscreen:[&_.fullscreen-enter-tooltip]:hidden',
    'vjs:[&_.fullscreen-exit-tooltip]:hidden vjs:data-fullscreen:[&_.fullscreen-exit-tooltip]:inline',
  ),
  FullscreenEnterTooltip: cn('fullscreen-enter-tooltip'),
  FullscreenExitTooltip: cn('fullscreen-exit-tooltip'),
  TimeControls: cn('vjs:flex-1 vjs:flex vjs:items-center vjs:gap-3 vjs:px-1.5'),
  TimeDisplay: cn('vjs:tabular-nums vjs:text-shadow-2xs/25'),
  SliderRoot: cn(
    'vjs:group/slider vjs:outline-0 vjs:flex vjs:items-center vjs:justify-center vjs:flex-1 vjs:relative vjs:rounded-full',
    'vjs:data-[orientation=horizontal]:h-5 vjs:data-[orientation=horizontal]:min-w-20',
    'vjs:data-[orientation=vertical]:w-5 vjs:data-[orientation=vertical]:h-20',
  ),
  SliderTrack: cn(
    'vjs:relative vjs:select-none vjs:transition-[outline-offset] vjs:rounded-[inherit] vjs:bg-white/20 vjs:ring-1 vjs:ring-black/5',
    'vjs:data-[orientation=horizontal]:w-full vjs:data-[orientation=horizontal]:h-1',
    'vjs:data-[orientation=vertical]:w-1',
    'vjs:-outline-offset-2 vjs:group-focus-visible/slider:outline-2 vjs:group-focus-visible/slider:outline-offset-6 vjs:group-focus-visible/slider:outline-blue-500',
  ),
  SliderProgress: cn('vjs:bg-white vjs:rounded-[inherit]'),
  // TODO: Work out what we want to do here.
  SliderPointer: cn('vjs:bg-white/20 vjs:rounded-[inherit]'),
  SliderThumb: cn(
    'vjs:bg-white vjs:z-10 vjs:select-none vjs:ring vjs:ring-black/10 vjs:rounded-full vjs:shadow-sm vjs:shadow-black/15 vjs:opacity-0 vjs:transition-[opacity,height,width] vjs:ease-out',
    'vjs:group-hover/slider:opacity-100 vjs:group-focus-within/slider:opacity-100',
    'vjs:size-2.5 vjs:active:size-3 vjs:group-active/slider:size-3',
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
  PopoverPopup: cn('vjs:relative vjs:px-1 vjs:py-3 vjs:rounded-full'),
  TooltipPopup: cn('vjs:whitespace-nowrap vjs:rounded-full vjs:text-white vjs:text-xs vjs:@7xl/root:text-sm vjs:px-2.5 vjs:py-1'),
};

/*
[1] @custom-variant reduced-transparency @media (prefers-reduced-transparency: reduce);
*/

export default styles;

import { StatusIndicator as StatusIndicatorPrimitive } from '@videojs/react';
import {
  CaptionsOffIcon,
  CaptionsOnIcon,
  FullscreenEnterIcon,
  FullscreenExitIcon,
  PauseIcon,
  PipEnterIcon,
  PipExitIcon,
  PlayIcon,
} from '@videojs/react/icons';

const TOP_STATUS_ACTIONS = ['toggleSubtitles', 'toggleFullscreen', 'togglePictureInPicture'] as const;

const PLAYBACK_STATUS_ACTIONS = ['togglePaused'] as const;

export function StatusIndicator({
  variant = 'default',
}: {
  variant?: 'default' | 'minimal';
} = {}) {
  return (
    <StatusIndicatorPrimitive.Root
      actions={TOP_STATUS_ACTIONS}
      className={
        variant === 'minimal'
          ? 'group/input-status pointer-events-none absolute top-3 flex items-center gap-2 rounded-media-pill bg-black/25 px-2.5 py-1 font-medium transition-[opacity,scale,translate] duration-100 ease-out data-starting-style:scale-90 data-starting-style:opacity-0 data-ending-style:-translate-y-1/4 data-ending-style:scale-90 data-ending-style:opacity-0 inset-x-0 top-0 w-full justify-center rounded-none bg-transparent pt-3 pb-32 shadow-none [backdrop-filter:none] after:hidden [background-image:linear-gradient(to_bottom,oklch(0_0_0/0.35),oklch(0_0_0/0.2)_3rem,transparent)] data-starting-style:scale-100 data-ending-style:scale-100 motion-safe:data-ending-style:-translate-y-full'
          : 'relative bg-media-surface text-media-controls shadow-media-surface backdrop-blur-media-surface after:pointer-events-none after:absolute after:inset-0 after:z-10 after:rounded-[inherit] after:shadow-[inset_0_1px_0_0_var(--media-surface-border)] group/input-status pointer-events-none absolute top-3 flex items-center gap-2 rounded-media-pill bg-black/25 px-2.5 py-1 font-medium transition-[opacity,scale,translate] duration-100 ease-out data-starting-style:scale-90 data-starting-style:opacity-0 data-ending-style:-translate-y-1/4 data-ending-style:scale-90 data-ending-style:opacity-0'
      }
    >
      <CaptionsOnIcon className="hidden shrink-0 group-data-[status=captions-on]/input-status:block" />
      <CaptionsOffIcon className="hidden shrink-0 group-data-[status=captions-off]/input-status:block" />
      <FullscreenEnterIcon className="hidden shrink-0 group-data-[status=fullscreen]/input-status:block" />
      <FullscreenExitIcon className="hidden shrink-0 group-data-[status=exit-fullscreen]/input-status:block" />
      <PipEnterIcon className="hidden shrink-0 group-data-[status=pip]/input-status:block" />
      <PipExitIcon className="hidden shrink-0 group-data-[status=exit-pip]/input-status:block" />
      <StatusIndicatorPrimitive.Value className="ml-auto" />
    </StatusIndicatorPrimitive.Root>
  );
}

export function PlaybackStatusIndicator({
  variant = 'default',
}: {
  variant?: 'default' | 'minimal';
} = {}) {
  return (
    <StatusIndicatorPrimitive.Root
      actions={PLAYBACK_STATUS_ACTIONS}
      className={
        variant === 'minimal'
          ? 'group/playback-status col-start-2 row-start-1 grid place-content-center rounded-media-pill bg-black/35 p-4 text-center backdrop-blur-sm transition-[opacity,scale] duration-200 ease-out data-starting-style:scale-[0.85] data-starting-style:opacity-0 data-ending-style:scale-[0.85] data-ending-style:opacity-0 data-ending-style:duration-100 motion-reduce:duration-50 rounded-none bg-transparent [backdrop-filter:none]'
          : 'group/playback-status col-start-2 row-start-1 grid place-content-center rounded-media-pill bg-black/35 p-4 text-center backdrop-blur-sm transition-[opacity,scale] duration-200 ease-out data-starting-style:scale-[0.85] data-starting-style:opacity-0 data-ending-style:scale-[0.85] data-ending-style:opacity-0 data-ending-style:duration-100 motion-reduce:duration-50'
      }
    >
      <PlayIcon className="hidden size-[calc(var(--media-icon-size)*1.5)] group-data-[status=play]/playback-status:block group-data-[status=play]/playback-status:translate-x-px" />
      <PauseIcon className="hidden size-[calc(var(--media-icon-size)*1.5)] group-data-[status=pause]/playback-status:block" />
    </StatusIndicatorPrimitive.Root>
  );
}

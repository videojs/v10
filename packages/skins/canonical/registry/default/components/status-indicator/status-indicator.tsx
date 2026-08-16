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
import { cn, resolveClassName } from '@/components/videojs/utils';

const TOP_STATUS_ACTIONS = ['toggleSubtitles', 'toggleFullscreen', 'togglePictureInPicture'] as const;

const PLAYBACK_STATUS_ACTIONS = ['togglePaused'] as const;

export interface StatusIndicatorProps extends Omit<StatusIndicatorPrimitive.RootProps, 'children' | 'actions'> {}

export function StatusIndicator({ className, ...props }: StatusIndicatorProps) {
  return (
    <StatusIndicatorPrimitive.Root
      {...props}
      actions={TOP_STATUS_ACTIONS}
      className={(state) =>
        cn(
          'group/input-status pointer-events-none flex items-center gap-2 font-medium',
          'transition-[opacity,scale,translate] duration-100 ease-out',
          'data-starting-style:opacity-0 data-ending-style:opacity-0',
          'text-media-controls shadow-media-surface [backdrop-filter:blur(var(--media-surface-backdrop-blur))_saturate(var(--media-surface-backdrop-saturate))]',
          'after:pointer-events-none after:absolute after:inset-0 after:z-10 after:rounded-[inherit]',
          'after:shadow-[inset_0_1px_0_0_var(--media-surface-inner-border),inset_0_0_0_1px_oklch(from_var(--media-surface-inner-border)_l_c_h/calc(alpha*0.5))]',
          'absolute top-3 rounded-media-pill bg-black/25 px-2.5 py-1',
          'data-starting-style:scale-90',
          'data-ending-style:-translate-y-1/4 data-ending-style:scale-90',
          resolveClassName(className, state),
        )
      }
    >
      <CaptionsOnIcon className={cn('hidden shrink-0', 'group-data-[status=captions-on]/input-status:block')} />
      <CaptionsOffIcon className={cn('hidden shrink-0', 'group-data-[status=captions-off]/input-status:block')} />
      <FullscreenEnterIcon className={cn('hidden shrink-0', 'group-data-[status=fullscreen]/input-status:block')} />
      <FullscreenExitIcon className={cn('hidden shrink-0', 'group-data-[status=exit-fullscreen]/input-status:block')} />
      <PipEnterIcon className={cn('hidden shrink-0', 'group-data-[status=pip]/input-status:block')} />
      <PipExitIcon className={cn('hidden shrink-0', 'group-data-[status=exit-pip]/input-status:block')} />
      <StatusIndicatorPrimitive.Value className="ml-auto" />
    </StatusIndicatorPrimitive.Root>
  );
}

export interface PlaybackStatusIndicatorProps extends Omit<
  StatusIndicatorPrimitive.RootProps,
  'children' | 'actions'
> {}

export function PlaybackStatusIndicator({ className, ...props }: PlaybackStatusIndicatorProps) {
  return (
    <StatusIndicatorPrimitive.Root
      {...props}
      actions={PLAYBACK_STATUS_ACTIONS}
      className={(state) =>
        cn(
          'group/playback-status col-start-2 row-start-1 grid place-content-center p-4 text-center',
          'transition-[opacity,scale] duration-200 ease-out data-starting-style:scale-[0.85] data-starting-style:opacity-0',
          'data-ending-style:scale-[0.85] data-ending-style:opacity-0 data-ending-style:duration-100',
          'motion-reduce:duration-50',
          'rounded-media-pill bg-black/35 backdrop-blur-sm',
          resolveClassName(className, state),
        )
      }
    >
      <PlayIcon
        className={cn(
          'hidden size-[calc(var(--media-icon-size)*1.5)]',
          'group-data-[status=play]/playback-status:block group-data-[status=play]/playback-status:translate-x-px',
        )}
      />
      <PauseIcon
        className={cn(
          'hidden size-[calc(var(--media-icon-size)*1.5)]',
          'group-data-[status=pause]/playback-status:block',
        )}
      />
    </StatusIndicatorPrimitive.Root>
  );
}

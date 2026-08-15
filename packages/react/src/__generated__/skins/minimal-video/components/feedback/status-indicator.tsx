import { StatusIndicator as StatusIndicatorPrimitive } from '@/ui/status-indicator';
import {
  CaptionsOffIcon,
  CaptionsOnIcon,
  FullscreenEnterIcon,
  FullscreenExitIcon,
  PauseIcon,
  PipEnterIcon,
  PipExitIcon,
  PlayIcon,
} from '@/icons/minimal';

const TOP_STATUS_ACTIONS = ['toggleSubtitles', 'toggleFullscreen', 'togglePictureInPicture'] as const;

const PLAYBACK_STATUS_ACTIONS = ['togglePaused'] as const;

export function StatusIndicator() {
  return (
    <StatusIndicatorPrimitive.Root actions={TOP_STATUS_ACTIONS} className="media-surface media-status-indicator">
      <CaptionsOnIcon className="media-status-indicator-icon media-status-captions-on-icon" />
      <CaptionsOffIcon className="media-status-indicator-icon media-status-captions-off-icon" />
      <FullscreenEnterIcon className="media-status-indicator-icon media-status-fullscreen-enter-icon" />
      <FullscreenExitIcon className="media-status-indicator-icon media-status-fullscreen-exit-icon" />
      <PipEnterIcon className="media-status-indicator-icon media-status-pip-enter-icon" />
      <PipExitIcon className="media-status-indicator-icon media-status-pip-exit-icon" />
      <StatusIndicatorPrimitive.Value className="media-status-indicator-value" />
    </StatusIndicatorPrimitive.Root>
  );
}

export function PlaybackStatusIndicator() {
  return (
    <StatusIndicatorPrimitive.Root actions={PLAYBACK_STATUS_ACTIONS} className="media-playback-status-indicator">
      <PlayIcon className="media-playback-status-icon media-status-play-icon" />
      <PauseIcon className="media-playback-status-icon media-status-pause-icon" />
    </StatusIndicatorPrimitive.Root>
  );
}

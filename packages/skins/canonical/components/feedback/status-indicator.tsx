import { StatusIndicator as StatusIndicatorPrimitive } from '@videojs/core/components';
import {
  CaptionsOffIcon,
  CaptionsOnIcon,
  FullscreenEnterIcon,
  FullscreenExitIcon,
  PauseIcon,
  PipEnterIcon,
  PipExitIcon,
  PlayIcon,
} from '@videojs/icons/components';
import styles from '../../styles/components/status-indicator.styles';

const TOP_STATUS_ACTIONS = ['toggleSubtitles', 'toggleFullscreen', 'togglePictureInPicture'] as const;

const PLAYBACK_STATUS_ACTIONS = ['togglePaused'] as const;

export function StatusIndicator() {
  return (
    <StatusIndicatorPrimitive.Root actions={TOP_STATUS_ACTIONS} className={styles.root}>
      <CaptionsOnIcon className={[styles.icon, styles.icons.captionsOn]} />
      <CaptionsOffIcon className={[styles.icon, styles.icons.captionsOff]} />
      <FullscreenEnterIcon className={[styles.icon, styles.icons.fullscreenEnter]} />
      <FullscreenExitIcon className={[styles.icon, styles.icons.fullscreenExit]} />
      <PipEnterIcon className={[styles.icon, styles.icons.pipEnter]} />
      <PipExitIcon className={[styles.icon, styles.icons.pipExit]} />
      <StatusIndicatorPrimitive.Value className={styles.value} />
    </StatusIndicatorPrimitive.Root>
  );
}

export function PlaybackStatusIndicator() {
  return (
    <StatusIndicatorPrimitive.Root actions={PLAYBACK_STATUS_ACTIONS} className={styles.playback.root}>
      <PlayIcon className={[styles.playback.icon, styles.playback.play]} />
      <PauseIcon className={[styles.playback.icon, styles.playback.pause]} />
    </StatusIndicatorPrimitive.Root>
  );
}

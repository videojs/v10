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
import styles from '../../styles/components/status-indicator.tailwind';

const TOP_STATUS_ACTIONS = ['toggleSubtitles', 'toggleFullscreen', 'togglePictureInPicture'] as const;
const PLAYBACK_STATUS_ACTIONS = ['togglePaused'] as const;

export function StatusIndicator() {
  return (
    <StatusIndicatorPrimitive.Root actions={TOP_STATUS_ACTIONS} className={styles.statusIndicator}>
      <CaptionsOnIcon className={[styles.statusIndicatorIcon, styles.statusCaptionsOnIcon]} />
      <CaptionsOffIcon className={[styles.statusIndicatorIcon, styles.statusCaptionsOffIcon]} />
      <FullscreenEnterIcon className={[styles.statusIndicatorIcon, styles.statusFullscreenEnterIcon]} />
      <FullscreenExitIcon className={[styles.statusIndicatorIcon, styles.statusFullscreenExitIcon]} />
      <PipEnterIcon className={[styles.statusIndicatorIcon, styles.statusPipEnterIcon]} />
      <PipExitIcon className={[styles.statusIndicatorIcon, styles.statusPipExitIcon]} />
      <StatusIndicatorPrimitive.Value className={styles.statusIndicatorValue} />
    </StatusIndicatorPrimitive.Root>
  );
}

export function PlaybackStatusIndicator() {
  return (
    <StatusIndicatorPrimitive.Root actions={PLAYBACK_STATUS_ACTIONS} className={styles.playbackStatusIndicator}>
      <PlayIcon className={[styles.playbackStatusIcon, styles.statusPlayIcon]} />
      <PauseIcon className={[styles.playbackStatusIcon, styles.statusPauseIcon]} />
    </StatusIndicatorPrimitive.Root>
  );
}

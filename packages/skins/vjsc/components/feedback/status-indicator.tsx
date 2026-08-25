import type { StatusIndicatorProps as CoreProps } from '@videojs/core';
import * as $ from '@videojs/core/vjsc';
import {
  CaptionsOffIcon,
  CaptionsOnIcon,
  FullscreenEnterIcon,
  FullscreenExitIcon,
  PauseIcon,
  PipEnterIcon,
  PipExitIcon,
  PlayIcon,
} from '@videojs/icons/vjsc';
import type { Props } from 'vjsc/components';

import type { SkinComponentMeta } from '../../meta';
import styles from '../../styles/components/status-indicator.styles';

const TOP_STATUS_ACTIONS = ['toggleSubtitles', 'toggleFullscreen', 'togglePictureInPicture'] as const;

const PLAYBACK_STATUS_ACTIONS = ['togglePaused'] as const;

export function StatusIndicator({ className, ...props }: Props<Omit<CoreProps, 'actions'>> = {}) {
  return (
    <$.StatusIndicator.Root actions={TOP_STATUS_ACTIONS} className={[styles.root, className]} {...props}>
      <CaptionsOnIcon className={[styles.icon, styles.icons.captionsOn]} />
      <CaptionsOffIcon className={[styles.icon, styles.icons.captionsOff]} />
      <FullscreenEnterIcon className={[styles.icon, styles.icons.fullscreenEnter]} />
      <FullscreenExitIcon className={[styles.icon, styles.icons.fullscreenExit]} />
      <PipEnterIcon className={[styles.icon, styles.icons.pipEnter]} />
      <PipExitIcon className={[styles.icon, styles.icons.pipExit]} />
      <$.StatusIndicator.Value className={styles.value} />
    </$.StatusIndicator.Root>
  );
}

export function PlaybackStatusIndicator({ className, ...props }: Props<Omit<CoreProps, 'actions'>> = {}) {
  return (
    <$.StatusIndicator.Root actions={PLAYBACK_STATUS_ACTIONS} className={[styles.playback.root, className]} {...props}>
      <PlayIcon className={[styles.playback.icon, styles.playback.play]} />
      <PauseIcon className={[styles.playback.icon, styles.playback.pause]} />
    </$.StatusIndicator.Root>
  );
}

export const meta = {
  name: 'status-indicator',
  type: 'component',
  title: 'Status Indicator',
  description: 'Visual feedback for captions, fullscreen, picture-in-picture, and playback actions.',
} as const satisfies SkinComponentMeta;

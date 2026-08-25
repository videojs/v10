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
import { Box, type Props } from 'vjsc/components';

import type { SkinComponentMeta } from '../../meta';
import playbackStyles from '../../styles/feedback/playback-status-indicator.styles';
import styles from '../../styles/feedback/status-indicator.styles';
import surfaceStyles from '../../styles/surfaces/surface.styles';

const TOP_STATUS_ACTIONS = ['toggleSubtitles', 'toggleFullscreen', 'togglePictureInPicture'] as const;

const PLAYBACK_STATUS_ACTIONS = ['togglePaused'] as const;

export function StatusIndicator({ className, ...props }: Props<Omit<CoreProps, 'actions'>> = {}) {
  return (
    <$.StatusIndicator.Root
      actions={TOP_STATUS_ACTIONS}
      className={[surfaceStyles.feedback, styles.root, className]}
      {...props}
    >
      <Box className={styles.content}>
        <CaptionsOnIcon className={styles.captionsOnIcon} />
        <CaptionsOffIcon className={styles.captionsOffIcon} />
        <FullscreenEnterIcon className={styles.fullscreenEnterIcon} />
        <FullscreenExitIcon className={styles.fullscreenExitIcon} />
        <PipEnterIcon className={styles.pipEnterIcon} />
        <PipExitIcon className={styles.pipExitIcon} />
        <$.StatusIndicator.Value className={styles.value} />
      </Box>
    </$.StatusIndicator.Root>
  );
}

export function PlaybackStatusIndicator({ className, ...props }: Props<Omit<CoreProps, 'actions'>> = {}) {
  return (
    <$.StatusIndicator.Root actions={PLAYBACK_STATUS_ACTIONS} className={[playbackStyles.root, className]} {...props}>
      <PlayIcon className={playbackStyles.playIcon} />
      <PauseIcon className={playbackStyles.pauseIcon} />
    </$.StatusIndicator.Root>
  );
}

export const meta = {
  name: 'status-indicator',
  type: 'component',
  title: 'Status Indicator',
  description: 'Visual feedback for captions, fullscreen, picture-in-picture, and playback actions.',
} as const satisfies SkinComponentMeta;

import * as $ from '@videojs/core/vjsc';
import {
  CaptionsOffIcon,
  CaptionsOnIcon,
  FullscreenEnterIcon,
  FullscreenExitIcon,
  PipEnterIcon,
  PipExitIcon,
  VolumeHighIcon,
  VolumeLowIcon,
  VolumeOffIcon,
} from '@videojs/icons/vjsc';
import { Box, type VjscNode } from 'vjsc/components';

import styles from './skin.styles';

const STATUS_ACTIONS = ['toggleSubtitles', 'toggleFullscreen', 'togglePictureInPicture'] as const;

/**
 * Transient feedback stacks above the title and below the controls, and never takes pointer input. The whole group is
 * hidden from assistive technology: `StatusAnnouncer` already speaks these same events, so exposing both would announce
 * every one of them twice.
 */
export function Indicators({ children }: { children?: VjscNode } = {}) {
  return (
    <Box aria-hidden="true" className={styles.indicators}>
      <VolumeIndicator />
      <StatusIndicator />
      {children}
    </Box>
  );
}

function StatusIndicator() {
  return (
    <$.StatusIndicator.Root actions={STATUS_ACTIONS} className={[styles.indicator, styles.statusIndicator]}>
      <CaptionsOnIcon className={[styles.statusIcon, styles.captionsOnStatusIcon]} />
      <CaptionsOffIcon className={[styles.statusIcon, styles.captionsOffStatusIcon]} />
      <FullscreenEnterIcon className={[styles.statusIcon, styles.fullscreenEnterStatusIcon]} />
      <FullscreenExitIcon className={[styles.statusIcon, styles.fullscreenExitStatusIcon]} />
      <PipEnterIcon className={[styles.statusIcon, styles.pipEnterStatusIcon]} />
      <PipExitIcon className={[styles.statusIcon, styles.pipExitStatusIcon]} />
      <$.StatusIndicator.Value />
    </$.StatusIndicator.Root>
  );
}

function VolumeIndicator() {
  return (
    <$.VolumeIndicator.Root className={[styles.indicator, styles.volumeIndicator]}>
      <$.VolumeIndicator.Fill className={styles.volumeIndicatorFill}>
        <VolumeHighIcon className={[styles.volumeStatusIcon, styles.volumeHighStatusIcon]} />
        <VolumeLowIcon className={[styles.volumeStatusIcon, styles.volumeLowStatusIcon]} />
        <VolumeOffIcon className={[styles.volumeStatusIcon, styles.volumeOffStatusIcon]} />
        <$.VolumeIndicator.Value className={styles.volumeStatusValue} />
      </$.VolumeIndicator.Fill>
    </$.VolumeIndicator.Root>
  );
}

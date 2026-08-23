import { type Props, Box as StatusIndicatorBox } from 'vjsc/components';

import styles from '../../styles/components/status-indicator-overlay.styles';
import { SeekIndicator } from './seek-indicator';
import { StatusAnnouncer } from './status-announcer';
import { PlaybackStatusIndicator, StatusIndicator } from './status-indicator';
import { VolumeIndicator } from './volume-indicator';

export function VideoStatusIndicators({ className, ...props }: Props = {}) {
  return (
    <>
      <StatusAnnouncer />
      <StatusIndicatorBox className={[styles.root, className]} {...props}>
        <VolumeIndicator />
        <StatusIndicator />
        <SeekIndicator />
        <PlaybackStatusIndicator />
      </StatusIndicatorBox>
    </>
  );
}

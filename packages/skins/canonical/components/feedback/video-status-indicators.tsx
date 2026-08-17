import type { FunctionComponent } from '@videojs/compiler/components';
import styles from '../../styles/components/status-indicator-overlay.styles';
import { SeekIndicator } from './seek-indicator';
import { StatusAnnouncer } from './status-announcer';
import { PlaybackStatusIndicator, StatusIndicator } from './status-indicator';
import { VolumeIndicator } from './volume-indicator';

declare const StatusIndicatorGroup: FunctionComponent;

export function VideoStatusIndicators() {
  return (
    <>
      <StatusAnnouncer />
      <StatusIndicatorGroup className={styles.root}>
        <VolumeIndicator />
        <StatusIndicator />
        <SeekIndicator />
        <PlaybackStatusIndicator />
      </StatusIndicatorGroup>
    </>
  );
}

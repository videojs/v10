import { Box, type Props } from 'vjsc/components';

import { SeekIndicator } from '../../components/feedback/seek-indicator';
import { StatusAnnouncer } from '../../components/feedback/status-announcer';
import { PlaybackStatusIndicator, StatusIndicator } from '../../components/feedback/status-indicator';
import { VolumeIndicator } from '../../components/feedback/volume-indicator';
import styles from '../shared/status-indicators.styles';

export function VideoStatusIndicators({ className, ...props }: Props = {}) {
  return (
    <>
      <StatusAnnouncer />
      <Box className={[styles.root, className]} {...props}>
        <VolumeIndicator />
        <StatusIndicator />
        <SeekIndicator />
        <PlaybackStatusIndicator />
      </Box>
    </>
  );
}

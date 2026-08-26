import { Box, type Props } from 'vjsc/components';

import styles from '../../styles/feedback/video-status-indicators.styles';
import { SeekIndicator } from './seek-indicator';
import { StatusAnnouncer } from './status-announcer';
import { PlaybackStatusIndicator, StatusIndicator } from './status-indicator';
import { VolumeIndicator } from './volume-indicator';

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

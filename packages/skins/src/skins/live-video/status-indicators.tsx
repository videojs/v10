import { Box, type Props } from 'vjsc/components';

import { StatusAnnouncer } from '../../components/feedback/status-announcer';
import { PlaybackStatusIndicator, StatusIndicator } from '../../components/feedback/status-indicator';
import { VolumeIndicator } from '../../components/feedback/volume-indicator';
import styles from '../shared/status-indicators.styles';

export function LiveVideoStatusIndicators({ className, ...props }: Props = {}) {
  return (
    <>
      <StatusAnnouncer />
      <Box className={[styles.root, className]} {...props}>
        <VolumeIndicator />
        <StatusIndicator />
        <PlaybackStatusIndicator />
      </Box>
    </>
  );
}

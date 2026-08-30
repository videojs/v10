import { Box, type Props } from 'vjsc/components';

import { PlayButton } from '../../components/buttons/play-button';
import { BufferingIndicator } from '../../components/feedback/buffering-indicator';
import styles from './play-button.styles';

export function AudioPlayButton({ className, ...props }: Props = {}) {
  return (
    <Box className={[styles.root, className]} {...props}>
      <BufferingIndicator className={styles.bufferingIndicator} />
      <PlayButton />
    </Box>
  );
}

import type { SeekButtonProps as CoreProps } from '@videojs/core';
import * as $ from '@videojs/core/vjsc';
import { SeekIcon } from '@videojs/icons/vjsc';
import { Box, type Props, Text } from 'vjsc/components';

import type { SkinComponentMeta } from '../../meta';
import buttonStyles from '../../styles/buttons/button.styles';
import styles from '../../styles/buttons/seek-button.styles';
import { Button } from './button';

export function SeekButton({ className, seconds = 10, ...props }: Props<CoreProps> = {}) {
  return (
    <$.SeekButton $render={Button} className={[styles.root, className]} seconds={seconds} {...props}>
      <Box className={styles.content}>
        <SeekIcon className={[buttonStyles.icon, seconds < 0 && styles.backwardIcon]} />
        <Text className={[styles.label, seconds < 0 ? styles.backwardLabel : styles.forwardLabel]}>
          {Math.abs(seconds)}
        </Text>
      </Box>
    </$.SeekButton>
  );
}

export const meta = {
  name: 'seek-button',
  type: 'component',
  title: 'Seek Button',
  description: 'A button that skips playback forward or backward with a direction-aware icon and value.',
} as const satisfies SkinComponentMeta;

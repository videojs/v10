import type { SeekButtonProps as CoreProps } from '@videojs/core';
import * as $ from '@videojs/core/vjsc';
import { SeekIcon } from '@videojs/icons/vjsc';
import { type Props, Text } from 'vjsc/components';

import type { SkinComponentMeta } from '../../meta';
import buttonStyles from '../../styles/buttons/button.styles';
import styles from '../../styles/buttons/seek-button.styles';
import { ButtonTooltip } from './button-tooltip';

export function SeekButton({ className, seconds = 10, ...props }: Props<CoreProps> = {}) {
  return (
    <ButtonTooltip side="top">
      <$.SeekButton className={[buttonStyles.root, styles.root, className]} seconds={seconds} {...props}>
        <SeekIcon className={[buttonStyles.icon, seconds < 0 && styles.backwardIcon]} />
        <Text className={styles.label}>{Math.abs(seconds)}</Text>
      </$.SeekButton>
    </ButtonTooltip>
  );
}

export const meta = {
  name: 'seek-button',
  type: 'component',
  title: 'Seek Button',
  description:
    'A button that skips playback forward or backward by a configurable number of seconds, with a direction-aware icon and accessible tooltip.',
} as const satisfies SkinComponentMeta;

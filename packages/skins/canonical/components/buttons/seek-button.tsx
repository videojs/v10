import type { SeekButtonProps as CoreProps } from '@videojs/core';
import * as $ from '@videojs/core/vjsc';
import { SeekIcon } from '@videojs/icons/vjsc';
import { type Props, Text } from 'vjsc/components';
import styles from '../../styles/components/button.styles';
import { ButtonTooltip } from './button-tooltip';

export function SeekButton({ className, seconds = 10, ...props }: Props<CoreProps> = {}) {
  return (
    <ButtonTooltip side="top">
      <$.SeekButton className={[styles.root, styles.seek, className]} seconds={seconds} {...props}>
        <SeekIcon className={[styles.icon, seconds < 0 ? styles.icons.seekBackward : undefined]} />
        <Text className={styles.label}>{Math.abs(seconds)}</Text>
      </$.SeekButton>
    </ButtonTooltip>
  );
}

import type { SeekButtonProps } from '@videojs/core';
import { SeekButton as SeekButtonPrimitive, Text } from '@videojs/core/components';
import { SeekIcon } from '@videojs/icons/components';
import styles from '../../styles/components/button.styles';
import { ButtonTooltip } from './button-tooltip';

export function SeekButton(props: SeekButtonProps = {}) {
  const seconds = props.seconds ?? 10;
  return (
    <ButtonTooltip side="top">
      <SeekButtonPrimitive className={[styles.root, styles.seek]} {...props} seconds={seconds}>
        <SeekIcon className={seconds < 0 ? [styles.icon, styles.icons.seekBackward] : styles.icon} />
        <Text className={styles.label}>{Math.abs(seconds)}</Text>
      </SeekButtonPrimitive>
    </ButtonTooltip>
  );
}

import type { SeekButtonProps } from '@videojs/core';
import { SeekButton as SeekButtonPrimitive, Text } from '@videojs/core/components';
import { SeekIcon } from '@videojs/icons/components';
import styles from '../../styles/components/button.tailwind';
import { ButtonTooltip } from './button-tooltip';

export function SeekButton(props: SeekButtonProps = {}) {
  const seconds = props.seconds ?? 10;

  return (
    <ButtonTooltip side="top">
      <SeekButtonPrimitive className={[styles.button, styles.seekButton]} {...props} seconds={seconds}>
        <SeekIcon className={seconds < 0 ? [styles.buttonIcon, styles.seekBackwardIcon] : styles.buttonIcon} />
        <Text className={styles.seekButtonLabel}>{Math.abs(seconds)}</Text>
      </SeekButtonPrimitive>
    </ButtonTooltip>
  );
}

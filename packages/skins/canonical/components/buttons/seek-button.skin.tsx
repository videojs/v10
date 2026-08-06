import type { SeekButtonProps } from '@videojs/core';
import { SeekButton as SeekButtonPrimitive, Text } from '@videojs/core/components';
import { SeekIcon } from '@videojs/icons/components';
import { button, buttonIcon, seekLabel } from '../../styles/components/button.tailwind';
import { ButtonTooltip } from './button-tooltip.skin';

export function SeekButton(props: SeekButtonProps = {}) {
  const seconds = props.seconds ?? 10;

  return (
    <ButtonTooltip>
      <SeekButtonPrimitive className={button.seek} {...props} seconds={seconds}>
        <SeekIcon className={seconds < 0 ? buttonIcon.seekBackward : buttonIcon.base} />
        <Text className={seekLabel}>{Math.abs(seconds)}</Text>
      </SeekButtonPrimitive>
    </ButtonTooltip>
  );
}

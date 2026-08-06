import type { SeekButtonProps } from '@videojs/core';
import { SeekButton as SeekButtonPrimitive, Text } from '@videojs/core/components';
import { SeekIcon } from '@videojs/icons/components';
import { Tooltip } from '../overlays/tooltip.skin';

export function SeekButton(props: SeekButtonProps = {}) {
  const seconds = props.seconds ?? 10;

  return (
    <Tooltip>
      <SeekButtonPrimitive {...props} seconds={seconds}>
        <SeekIcon />
        <Text>{Math.abs(seconds)}</Text>
      </SeekButtonPrimitive>
    </Tooltip>
  );
}

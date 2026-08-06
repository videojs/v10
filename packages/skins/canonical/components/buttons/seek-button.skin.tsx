import type { SeekButtonProps } from '@videojs/core';
import { SeekButton as SeekButtonPrimitive, Text, Tooltip } from '@videojs/core/components';
import { SeekIcon } from '@videojs/icons/components';

export function SeekButton(props: SeekButtonProps = {}) {
  const seconds = props.seconds ?? 10;

  return (
    <Tooltip.Root side="top">
      <Tooltip.Trigger>
        <SeekButtonPrimitive {...props} seconds={seconds}>
          <SeekIcon />
          <Text>{Math.abs(seconds)}</Text>
        </SeekButtonPrimitive>
      </Tooltip.Trigger>
      <Tooltip.Popup>
        <Tooltip.Label />
        <Tooltip.Shortcut />
      </Tooltip.Popup>
    </Tooltip.Root>
  );
}

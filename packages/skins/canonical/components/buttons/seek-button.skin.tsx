import { SeekButton as SeekButtonPrimitive, Text, Tooltip } from '@videojs/core/components';
import { SeekIcon } from '@videojs/icons/components';

export interface SeekButtonProps {
  seconds?: number | undefined;
}

export function SeekButton({ seconds = 10 }: SeekButtonProps = {}) {
  return (
    <Tooltip.Root side="top">
      <Tooltip.Trigger>
        <SeekButtonPrimitive seconds={seconds}>
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

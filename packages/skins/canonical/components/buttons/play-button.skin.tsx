import { PlayButton as PlayButtonPrimitive, Tooltip } from '@videojs/core/components';
import { PauseIcon, PlayIcon, RestartIcon } from '@videojs/icons/components';

export function PlayButton() {
  return (
    <Tooltip.Root side="top">
      <Tooltip.Trigger>
        <PlayButtonPrimitive>
          <RestartIcon />
          <PlayIcon />
          <PauseIcon />
        </PlayButtonPrimitive>
      </Tooltip.Trigger>
      <Tooltip.Popup>
        <Tooltip.Label />
        <Tooltip.Shortcut />
      </Tooltip.Popup>
    </Tooltip.Root>
  );
}

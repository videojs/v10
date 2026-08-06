import { FullscreenButton as FullscreenButtonPrimitive, Tooltip } from '@videojs/core/components';
import { FullscreenEnterIcon, FullscreenExitIcon } from '@videojs/icons/components';

export function FullscreenButton() {
  return (
    <Tooltip.Root side="top">
      <Tooltip.Trigger>
        <FullscreenButtonPrimitive>
          <FullscreenEnterIcon />
          <FullscreenExitIcon />
        </FullscreenButtonPrimitive>
      </Tooltip.Trigger>
      <Tooltip.Popup>
        <Tooltip.Label />
        <Tooltip.Shortcut />
      </Tooltip.Popup>
    </Tooltip.Root>
  );
}

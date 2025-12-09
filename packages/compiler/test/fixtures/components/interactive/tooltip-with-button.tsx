import { PlayButton, Tooltip } from '@videojs/react';
import { PlayIcon } from '@videojs/react/icons';

export default function TestFixture() {
  return (
    <Tooltip.Root delay={500}>
      <Tooltip.Trigger>
        <PlayButton className="btn">
          <PlayIcon className="icon" />
        </PlayButton>
      </Tooltip.Trigger>
      <Tooltip.Positioner side="top" sideOffset={12} collisionPadding={12}>
        <Tooltip.Popup className="popup">
          <span>Play</span>
        </Tooltip.Popup>
      </Tooltip.Positioner>
    </Tooltip.Root>
  );
}

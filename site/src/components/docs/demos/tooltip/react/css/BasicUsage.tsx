import { Tooltip } from '@videojs/react';

export default function BasicUsage() {
  return (
    <div className="demo">
      <Tooltip.Root>
        <Tooltip.Trigger className="trigger">Hover me</Tooltip.Trigger>
        <Tooltip.Popup className="media-tooltip">
          <Tooltip.Arrow className="arrow" />
          <Tooltip.Label>Tooltip content</Tooltip.Label>
        </Tooltip.Popup>
      </Tooltip.Root>
    </div>
  );
}

import { Tooltip } from '@videojs/react';

import './BasicUsage.css';

export default function BasicUsage() {
  return (
    <div className="react-tooltip-basic">
      <Tooltip.Root>
        <Tooltip.Trigger className="react-tooltip-basic__trigger">Hover me</Tooltip.Trigger>
        <Tooltip.Popup className="react-tooltip-basic__popup">
          <Tooltip.Arrow className="react-tooltip-basic__arrow" />
          Tooltip content
        </Tooltip.Popup>
      </Tooltip.Root>
    </div>
  );
}

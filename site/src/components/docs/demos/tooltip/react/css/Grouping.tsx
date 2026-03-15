import { Tooltip } from '@videojs/react';

import './Grouping.css';

export default function Grouping() {
  return (
    <div className="react-tooltip-grouping">
      <Tooltip.Provider>
        <Tooltip.Root>
          <Tooltip.Trigger className="react-tooltip-grouping__trigger">Bold</Tooltip.Trigger>
          <Tooltip.Popup className="react-tooltip-grouping__popup">
            <Tooltip.Arrow className="react-tooltip-grouping__arrow" />
            Toggle bold
          </Tooltip.Popup>
        </Tooltip.Root>
        <Tooltip.Root>
          <Tooltip.Trigger className="react-tooltip-grouping__trigger">Italic</Tooltip.Trigger>
          <Tooltip.Popup className="react-tooltip-grouping__popup">
            <Tooltip.Arrow className="react-tooltip-grouping__arrow" />
            Toggle italic
          </Tooltip.Popup>
        </Tooltip.Root>
        <Tooltip.Root>
          <Tooltip.Trigger className="react-tooltip-grouping__trigger">Underline</Tooltip.Trigger>
          <Tooltip.Popup className="react-tooltip-grouping__popup">
            <Tooltip.Arrow className="react-tooltip-grouping__arrow" />
            Toggle underline
          </Tooltip.Popup>
        </Tooltip.Root>
      </Tooltip.Provider>
    </div>
  );
}

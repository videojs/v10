import { Tooltip } from '@videojs/react';

import './Grouping.css';

export default function Grouping() {
  return (
    <div className="react-tooltip-grouping">
      <Tooltip.Provider>
        <Tooltip.Root>
          <Tooltip.Trigger className="react-tooltip-grouping__trigger">Play</Tooltip.Trigger>
          <Tooltip.Popup className="react-tooltip-grouping__popup">
            <Tooltip.Arrow className="react-tooltip-grouping__arrow" />
            Play video
          </Tooltip.Popup>
        </Tooltip.Root>
        <Tooltip.Root>
          <Tooltip.Trigger className="react-tooltip-grouping__trigger">Mute</Tooltip.Trigger>
          <Tooltip.Popup className="react-tooltip-grouping__popup">
            <Tooltip.Arrow className="react-tooltip-grouping__arrow" />
            Mute audio
          </Tooltip.Popup>
        </Tooltip.Root>
        <Tooltip.Root>
          <Tooltip.Trigger className="react-tooltip-grouping__trigger">Fullscreen</Tooltip.Trigger>
          <Tooltip.Popup className="react-tooltip-grouping__popup">
            <Tooltip.Arrow className="react-tooltip-grouping__arrow" />
            Enter fullscreen
          </Tooltip.Popup>
        </Tooltip.Root>
      </Tooltip.Provider>
    </div>
  );
}

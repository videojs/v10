import { Tooltip } from '@videojs/react';

export default function Grouping() {
  return (
    <div className="demo">
      <Tooltip.Provider>
        <Tooltip.Root>
          <Tooltip.Trigger className="trigger">Play</Tooltip.Trigger>
          <Tooltip.Popup className="media-tooltip">
            <Tooltip.Arrow className="arrow" />
            <Tooltip.Label>Play video</Tooltip.Label>
          </Tooltip.Popup>
        </Tooltip.Root>
        <Tooltip.Root>
          <Tooltip.Trigger className="trigger">Mute</Tooltip.Trigger>
          <Tooltip.Popup className="media-tooltip">
            <Tooltip.Arrow className="arrow" />
            <Tooltip.Label>Mute audio</Tooltip.Label>
          </Tooltip.Popup>
        </Tooltip.Root>
        <Tooltip.Root>
          <Tooltip.Trigger className="trigger">Fullscreen</Tooltip.Trigger>
          <Tooltip.Popup className="media-tooltip">
            <Tooltip.Arrow className="arrow" />
            <Tooltip.Label>Enter fullscreen</Tooltip.Label>
          </Tooltip.Popup>
        </Tooltip.Root>
      </Tooltip.Provider>
    </div>
  );
}

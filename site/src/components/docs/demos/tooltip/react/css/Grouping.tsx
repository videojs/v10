import { Tooltip } from '@videojs/react';

export default function Grouping() {
  return (
    <div className="demo">
      <Tooltip.Provider>
        <Tooltip.Root>
          <Tooltip.Trigger className="trigger">Play</Tooltip.Trigger>
          <Tooltip.Popup className="media-tooltip">
            <Tooltip.Arrow className="arrow" />
            Play video
          </Tooltip.Popup>
        </Tooltip.Root>
        <Tooltip.Root>
          <Tooltip.Trigger className="trigger">Mute</Tooltip.Trigger>
          <Tooltip.Popup className="media-tooltip">
            <Tooltip.Arrow className="arrow" />
            Mute audio
          </Tooltip.Popup>
        </Tooltip.Root>
        <Tooltip.Root>
          <Tooltip.Trigger className="trigger">Fullscreen</Tooltip.Trigger>
          <Tooltip.Popup className="media-tooltip">
            <Tooltip.Arrow className="arrow" />
            Enter fullscreen
          </Tooltip.Popup>
        </Tooltip.Root>
      </Tooltip.Provider>
    </div>
  );
}

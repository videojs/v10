import { MuteButton, Popover, VolumeSlider } from '@videojs/react';

export default function TestFixture() {
  return (
    <Popover.Root openOnHover delay={200} closeDelay={100}>
      <Popover.Trigger>
        <MuteButton className="btn" />
      </Popover.Trigger>
      <Popover.Positioner side="top" sideOffset={12}>
        <Popover.Popup className="popup">
          <VolumeSlider.Root className="slider" orientation="vertical">
            <VolumeSlider.Track className="track">
              <VolumeSlider.Progress className="progress" />
            </VolumeSlider.Track>
            <VolumeSlider.Thumb className="thumb" />
          </VolumeSlider.Root>
        </Popover.Popup>
      </Popover.Positioner>
    </Popover.Root>
  );
}

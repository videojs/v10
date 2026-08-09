import { Popover } from '@videojs/core/components';
import styles from '../../styles/components/popup.tailwind';
import { MuteButton } from '../buttons/mute-button';
import { VolumeSlider } from '../sliders/volume-slider';

export function VolumePopover() {
  return (
    <Popover.Root openOnHover delay={200} closeDelay={100} side="top">
      <Popover.Trigger>
        <MuteButton />
      </Popover.Trigger>
      <Popover.Popup className={[styles.surface, styles.volumePopover]}>
        <VolumeSlider orientation="vertical" />
      </Popover.Popup>
    </Popover.Root>
  );
}

import type { PopoverProps, VolumeSliderProps } from '@videojs/core';
import { Popover } from '@videojs/core/components';
import styles from '../../styles/components/popup.styles';
import { MuteButton } from '../buttons/mute-button';
import { VolumeSlider } from '../sliders/volume-slider';

export interface VolumePopoverProps {
  side?: PopoverProps['side'];
  orientation?: VolumeSliderProps['orientation'];
}

export function VolumePopover({ side = 'top', orientation = 'vertical' }: VolumePopoverProps = {}) {
  return (
    <Popover.Root openOnHover delay={200} closeDelay={100} side={side}>
      <Popover.Trigger>
        <MuteButton />
      </Popover.Trigger>
      <Popover.Popup className={[styles.surface, styles.volume]}>
        <VolumeSlider orientation={orientation} />
      </Popover.Popup>
    </Popover.Root>
  );
}

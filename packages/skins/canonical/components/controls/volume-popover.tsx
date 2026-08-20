import type { PopoverProps as CoreProps, VolumeSliderProps as CoreVolumeSliderProps } from '@videojs/core';
import * as $ from '@videojs/core/vjsc';
import type { Props } from 'vjsc/components';
import styles from '../../styles/components/popup.styles';
import { MuteButton } from '../buttons/mute-button';
import { VolumeSlider } from '../sliders/volume-slider';

export function VolumePopover({
  className,
  side = 'top',
  orientation = 'vertical',
  ...props
}: Props<
  CoreProps & {
    orientation?: CoreVolumeSliderProps['orientation'];
  }
> = {}) {
  return (
    <$.Popover.Root openOnHover delay={200} closeDelay={100} side={side} {...props}>
      <$.Popover.Trigger>
        <MuteButton />
      </$.Popover.Trigger>
      <$.Popover.Popup className={[styles.surface, styles.volume, className]}>
        <VolumeSlider orientation={orientation} />
      </$.Popover.Popup>
    </$.Popover.Root>
  );
}

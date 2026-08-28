import type { VolumePopoverProps as CoreProps, VolumeSliderProps as CoreVolumeSliderProps } from '@videojs/core';
import * as $ from '@videojs/core/vjsc';
import type { Props } from 'vjsc/components';

import type { SkinComponentMeta } from '../../meta';
import styles from '../../styles/popups/volume-popover.styles';
import { ButtonTooltip } from '../buttons/button-tooltip';
import { MuteButton } from '../buttons/mute-button';
import { VolumeSlider } from '../sliders/volume-slider';

export function VolumePopover({
  className,
  showTooltip = false,
  side = 'top',
  orientation = 'vertical',
  ...props
}: Props<
  CoreProps & {
    orientation?: CoreVolumeSliderProps['orientation'];
    showTooltip?: boolean;
  }
> = {}) {
  return (
    <$.VolumePopover.Root openOnHover delay={200} closeDelay={100} side={side} {...props}>
      <ButtonTooltip delay={0} disabled={!showTooltip} sticky side="top">
        <$.VolumePopover.Trigger>
          <MuteButton className={className} />
        </$.VolumePopover.Trigger>
      </ButtonTooltip>
      <$.VolumePopover.Popup className={styles.popup}>
        <VolumeSlider orientation={orientation} />
      </$.VolumePopover.Popup>
    </$.VolumePopover.Root>
  );
}

export const meta = {
  name: 'volume-popover',
  type: 'component',
  title: 'Volume Control',
  description: 'A mute toggle with a vertical slider for adjusting playback volume in a popover.',
} as const satisfies SkinComponentMeta;

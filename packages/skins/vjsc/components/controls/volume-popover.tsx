import type { VolumePopoverProps as CoreProps, VolumeSliderProps as CoreVolumeSliderProps } from '@videojs/core';
import * as $ from '@videojs/core/vjsc';
import type { Props } from 'vjsc/components';

import type { SkinComponentMeta } from '../../meta';
import popupStyles from '../../styles/popups/popup.styles';
import styles from '../../styles/popups/volume-popover.styles';
import surfaceStyles from '../../styles/surfaces/surface.styles';
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
    <$.VolumePopover.Root openOnHover delay={200} closeDelay={100} side={side} {...props}>
      <$.VolumePopover.Trigger>
        <MuteButton />
      </$.VolumePopover.Trigger>
      <$.VolumePopover.Popup
        className={[
          popupStyles.root,
          popupStyles.transition,
          popupStyles.safeArea,
          surfaceStyles.root,
          styles.popup,
          className,
        ]}
      >
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

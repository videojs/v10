import { Controls, Time as TimePrimitive, Tooltip } from '@videojs/core/components';
import { Slot } from '@videojs/jsx';
import { FullscreenButton } from '../../components/buttons/fullscreen-button';
import { PlayButton } from '../../components/buttons/play-button';
import { VolumePopover } from '../../components/controls/volume-popover';
import { Container } from '../../components/layout/container';
import { Overlay } from '../../components/layout/overlay';
import { Poster } from '../../components/layout/poster';
import { TimeSlider } from '../../components/sliders/time-slider';
import styles from '../../styles/skins/default-video.tailwind';

export function DefaultVideoSkin() {
  return (
    <Container>
      <Slot />
      <Poster />

      <Controls.Root className={styles.controls}>
        <Tooltip.Provider>
          <Controls.Group className={styles.controlsGroup.primary}>
            <PlayButton />
          </Controls.Group>

          <Controls.Group className={styles.controlsGroup.time}>
            <TimePrimitive.Value className={styles.time} type="current" />
            <TimeSlider />
            <TimePrimitive.Value className={styles.time} type="remaining" toggle />
          </Controls.Group>

          <Controls.Group className={styles.controlsGroup.primary}>
            <VolumePopover />
            <FullscreenButton />
          </Controls.Group>
        </Tooltip.Provider>
      </Controls.Root>

      <Overlay />
    </Container>
  );
}

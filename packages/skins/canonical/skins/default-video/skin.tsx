import { Controls, Time as TimePrimitive, Tooltip } from '@videojs/core/components';
import { Slot } from '@videojs/jsx';
import { AirPlayButton } from '../../components/buttons/airplay-button';
import { CaptionsButton } from '../../components/buttons/captions-button';
import { CastButton } from '../../components/buttons/cast-button';
import { FullscreenButton } from '../../components/buttons/fullscreen-button';
import { PiPButton } from '../../components/buttons/pip-button';
import { PlayButton } from '../../components/buttons/play-button';
import { VolumePopover } from '../../components/controls/volume-popover';
import { BufferingIndicator } from '../../components/feedback/buffering-indicator';
import { ErrorDialog } from '../../components/feedback/error-dialog';
import { VideoInputIndicators } from '../../components/feedback/video-input-indicators';
import { VideoInputBindings } from '../../components/input/video-input-bindings';
import { Container } from '../../components/layout/container';
import { Overlay } from '../../components/layout/overlay';
import { Poster } from '../../components/layout/poster';
import { VideoSettingsMenu } from '../../components/menus/video-settings-menu';
import { TimeSlider } from '../../components/sliders/time-slider';
import styles from '../../styles/skins/default-video.tailwind';

export function DefaultVideoSkin() {
  return (
    <Container>
      <Slot />
      <Poster />
      <BufferingIndicator />
      <ErrorDialog />

      <Controls.Root className={styles.controls.root}>
        <Tooltip.Provider>
          <Controls.Group className={styles.controls.primary}>
            <Controls.Group className={styles.buttonGroup}>
              <PlayButton />
              <VolumePopover />
            </Controls.Group>

            <Controls.Group className={styles.timeControls}>
              <TimePrimitive.Value className={styles.time.current} type="current" />
              <TimeSlider />
              <TimePrimitive.Value className={styles.time.remaining} type="remaining" toggle />
            </Controls.Group>

            <Controls.Group className={styles.buttonGroup}>
              <CaptionsButton />
              <VideoSettingsMenu />
            </Controls.Group>
          </Controls.Group>

          <Controls.Group className={styles.controls.secondary}>
            <Controls.Group className={styles.buttonGroup}>
              <CastButton />
              <AirPlayButton />
              <PiPButton />
              <FullscreenButton />
            </Controls.Group>
          </Controls.Group>
        </Tooltip.Provider>
      </Controls.Root>

      <Overlay />
      <VideoInputBindings />
      <VideoInputIndicators />
    </Container>
  );
}

import * as $ from '@videojs/core/vjsc';
import { type PropsOf, Slot, type VjscNode } from 'vjsc/components';
import { AirPlayButton } from '../../components/buttons/airplay-button';
import { CaptionsButton } from '../../components/buttons/captions-button';
import { CastButton } from '../../components/buttons/cast-button';
import { FullscreenButton } from '../../components/buttons/fullscreen-button';
import { PiPButton } from '../../components/buttons/pip-button';
import { PlayButton } from '../../components/buttons/play-button';
import { VolumePopover } from '../../components/controls/volume-popover';
import { BufferingIndicator } from '../../components/feedback/buffering-indicator';
import { ErrorDialog } from '../../components/feedback/error-dialog';
import { VideoStatusIndicators } from '../../components/feedback/video-status-indicators';
import { Container } from '../../components/layout/container';
import { Overlay } from '../../components/layout/overlay';
import { Poster } from '../../components/layout/poster';
import { VideoSettingsMenu } from '../../components/menus/video-settings-menu';
import { TimeSlider } from '../../components/sliders/time-slider';
import { VideoGestures } from '../../components/video-gestures';
import { VideoHotkeys } from '../../components/video-hotkeys';
import type { SkinMeta } from '../../meta';
import styles from '../../styles/skins/default-video.styles';

export interface DefaultVideoSkinProps extends Omit<PropsOf<typeof Container>, 'children'> {
  children?: VjscNode;
  poster?: string | PropsOf<typeof Poster>['children'];
}

export function DefaultVideoSkin({ children, className, poster, ...props }: DefaultVideoSkinProps = {}) {
  const isPosterString = typeof poster === 'string';

  return (
    <Container className={['media-skin media-skin-video media-theme-default', className]} {...props}>
      <Slot>{children}</Slot>
      <Poster src={isPosterString ? poster : undefined}>{isPosterString ? undefined : poster}</Poster>
      <BufferingIndicator />
      <ErrorDialog />

      <$.Controls.Root className={styles.controls.root}>
        <$.Tooltip.Provider>
          <$.Controls.Group className={styles.controls.primary}>
            <$.Controls.Group className={styles.buttons}>
              <PlayButton />
              <VolumePopover />
            </$.Controls.Group>

            <$.Controls.Group className={styles.timeline}>
              <$.Time.Value className={styles.time.current} type="current" />
              <TimeSlider />
              <$.Time.Value className={styles.time.remaining} type="remaining" toggle />
            </$.Controls.Group>

            <$.Controls.Group className={styles.buttons}>
              <CaptionsButton />
              <VideoSettingsMenu />
            </$.Controls.Group>
          </$.Controls.Group>

          <$.Controls.Group className={styles.controls.secondary}>
            <$.Controls.Group className={styles.buttons}>
              <CastButton />
              <AirPlayButton />
              <PiPButton />
              <FullscreenButton />
            </$.Controls.Group>
          </$.Controls.Group>
        </$.Tooltip.Provider>
      </$.Controls.Root>

      <Overlay />
      <VideoHotkeys />
      <VideoGestures />
      <VideoStatusIndicators />
    </Container>
  );
}

export const meta = {
  name: 'default-video',
  type: 'skin',
  style: {
    scope: 'media-skin-video',
    theme: 'default',
    variant: 'default',
  },
  title: 'Default Video Skin',
  description: 'A complete on-demand video skin with responsive controls, settings, feedback, and input controls.',
} as const satisfies SkinMeta;

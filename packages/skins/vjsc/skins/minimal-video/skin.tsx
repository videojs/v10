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
import styles from '../../styles/skins/minimal-video.styles';

export interface MinimalVideoSkinProps extends Omit<PropsOf<typeof Container>, 'children'> {
  children?: VjscNode;
  poster?: string | PropsOf<typeof Poster>['children'];
}

export function MinimalVideoSkin({ children, className, poster, ...props }: MinimalVideoSkinProps = {}) {
  const isPosterString = String(poster) === poster;

  return (
    <Container className={['media-skin media-skin-video-minimal media-theme-minimal', className]} {...props}>
      <Slot>{children}</Slot>
      <Poster src={isPosterString ? poster : undefined}>{isPosterString ? undefined : poster}</Poster>
      <BufferingIndicator />
      <ErrorDialog />

      <$.Controls.Root className={styles.controls.root}>
        <$.Tooltip.Provider>
          <$.Controls.Group className={styles.controls.start}>
            <PlayButton />
            <VolumePopover side="right" orientation="horizontal" />
          </$.Controls.Group>

          <$.Controls.Group className={styles.timeline}>
            <$.Time.Group className={styles.time.group}>
              <$.Time.Value className={styles.time.current} type="current" toggle />
              <$.Time.Separator className={styles.time.separator} />
              <$.Time.Value className={styles.time.duration} type="duration" />
            </$.Time.Group>
            <TimeSlider />
          </$.Controls.Group>

          <$.Controls.Group className={styles.controls.end}>
            <CaptionsButton />
            <VideoSettingsMenu />
            <$.Controls.Group className={styles.controls.remote}>
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
  name: 'minimal-video',
  type: 'skin',
  style: {
    scope: 'media-skin-video-minimal',
    theme: 'minimal',
    variant: 'minimal',
  },
  title: 'Minimal Video Skin',
  description: 'A compact on-demand video skin with wrapping controls and the complete video component set.',
} as const satisfies SkinMeta;

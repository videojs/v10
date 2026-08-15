import { Controls } from '@/ui/controls';
import { Time as TimePrimitive } from '@/ui/time';
import { Tooltip } from '@/ui/tooltip';
import { AirPlayButton } from './components/buttons/airplay-button';
import { CaptionsButton } from './components/buttons/captions-button';
import { CastButton } from './components/buttons/cast-button';
import { FullscreenButton } from './components/buttons/fullscreen-button';
import { PiPButton } from './components/buttons/pip-button';
import { PlayButton } from './components/buttons/play-button';
import { VolumePopover } from './components/controls/volume-popover';
import { BufferingIndicator } from './components/feedback/buffering-indicator';
import { ErrorDialog } from './components/feedback/error-dialog';
import { VideoInputIndicators } from './components/feedback/video-input-indicators';
import { VideoInputBindings } from './components/input/video-input-bindings';
import { Container } from './components/layout/container';
import { Overlay } from './components/layout/overlay';
import { Poster } from './components/layout/poster';
import { VideoSettingsMenu } from './components/menus/video-settings-menu';
import { TimeSlider } from './components/sliders/time-slider';
import { cn } from '@videojs/utils/style';
import type { ReactNode } from 'react';
import type { ContainerProps } from '@/player/container';
import type { PosterProps } from '@/ui/poster';

export interface DefaultVideoSkinProps extends Omit<ContainerProps, 'children'> {
  children?: ReactNode;
  poster?: string | PosterProps['render'] | undefined;
}

export function DefaultVideoSkin({ children, className, poster, ...containerProps }: DefaultVideoSkinProps = {}) {
  return (
    <Container {...containerProps} className={cn('media-skin media-skin-video media-theme-default', className)}>
      {children}
      {poster && (
        <Poster
          src={typeof poster === 'string' ? poster : undefined}
          render={typeof poster === 'string' ? undefined : poster}
        />
      )}
      <BufferingIndicator />
      <ErrorDialog />

      <Controls.Root className="media-controls">
        <Tooltip.Provider>
          <Controls.Group className="media-controls-group-primary">
            <PlayButton />
          </Controls.Group>

          <Controls.Group className="media-controls-group-time">
            <TimePrimitive.Value className="media-time" type="current" />
            <TimeSlider />
            <TimePrimitive.Value className="media-time" type="remaining" toggle />
          </Controls.Group>

          <Controls.Group className="media-controls-group-primary">
            <CaptionsButton />
            <VolumePopover />
            <VideoSettingsMenu />
            <CastButton />
            <AirPlayButton />
            <PiPButton />
            <FullscreenButton />
          </Controls.Group>
        </Tooltip.Provider>
      </Controls.Root>

      <Overlay />
      <VideoInputBindings />
      <VideoInputIndicators />
    </Container>
  );
}

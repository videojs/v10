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

export interface MinimalVideoSkinProps extends Omit<ContainerProps, 'children'> {
  children?: ReactNode;
  poster?: string | PosterProps['render'] | undefined;
}

export function MinimalVideoSkin({ children, className, poster, ...containerProps }: MinimalVideoSkinProps = {}) {
  return (
    <Container {...containerProps} className={cn('media-skin media-skin-video-minimal media-theme-minimal', className)}>
      {children}
      {poster && (
        <Poster
          src={typeof poster === 'string' ? poster : undefined}
          render={typeof poster === 'string' ? undefined : poster}
        />
      )}
      <BufferingIndicator />
      <ErrorDialog variant="minimal" />

      <Controls.Root className="media-controls-root">
        <Tooltip.Provider>
          <Controls.Group className="media-controls-start">
            <PlayButton />
            <VolumePopover side="right" orientation="horizontal" />
          </Controls.Group>

          <Controls.Group className="media-time-controls">
            <TimePrimitive.Group className="media-time-group">
              <TimePrimitive.Value className="media-time-current" type="current" toggle />
              <TimePrimitive.Separator className="media-time-separator" />
              <TimePrimitive.Value className="media-time-duration" type="duration" />
            </TimePrimitive.Group>
            <TimeSlider />
          </Controls.Group>

          <Controls.Group className="media-controls-end">
            <CaptionsButton />
            <VideoSettingsMenu />
            <Controls.Group className="media-controls-remote">
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
      <VideoInputIndicators variant="minimal" />
    </Container>
  );
}

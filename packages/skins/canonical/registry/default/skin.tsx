import { Controls, Time as TimePrimitive, Tooltip } from '@videojs/react';
import { AirPlayButton } from '@/components/videojs/airplay-button/airplay-button';
import { CaptionsButton } from '@/components/videojs/captions-button/captions-button';
import { CastButton } from '@/components/videojs/cast-button/cast-button';
import { FullscreenButton } from '@/components/videojs/fullscreen-button/fullscreen-button';
import { PiPButton } from '@/components/videojs/pip-button/pip-button';
import { PlayButton } from '@/components/videojs/play-button/play-button';
import { VolumePopover } from '@/components/videojs/volume-popover/volume-popover';
import { BufferingIndicator } from '@/components/videojs/buffering-indicator/buffering-indicator';
import { ErrorDialog } from '@/components/videojs/error-dialog/error-dialog';
import { VideoInputIndicators } from './internal/components/feedback/video-input-indicators';
import { Container } from '@/components/videojs/container/container';
import { Overlay } from '@/components/videojs/overlay/overlay';
import { Poster } from '@/components/videojs/poster/poster';
import { VideoSettingsMenu } from '@/components/videojs/video-settings-menu/video-settings-menu';
import { TimeSlider } from '@/components/videojs/time-slider/time-slider';
import { cn } from '@videojs/utils/style';
import type { ReactNode } from 'react';
import type { ContainerProps, PosterProps } from '@videojs/react';

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

      <Controls.Root className="absolute inset-x-media-controls-gap bottom-media-controls-gap z-10 flex items-center gap-media-controls-gap rounded-media-pill p-media-controls-padding font-media text-media leading-none text-media-controls bg-media-surface shadow-media-surface backdrop-blur-media-surface">
        <Tooltip.Provider>
          <Controls.Group className="flex items-center gap-media-controls-gap">
            <PlayButton />
          </Controls.Group>

          <Controls.Group className="flex flex-1 items-center gap-media-controls-gap">
            <TimePrimitive.Value className="tabular-nums" type="current" />
            <TimeSlider />
            <TimePrimitive.Value className="tabular-nums" type="remaining" toggle />
          </Controls.Group>

          <Controls.Group className="flex items-center gap-media-controls-gap">
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
      <VideoInputIndicators />
    </Container>
  );
}

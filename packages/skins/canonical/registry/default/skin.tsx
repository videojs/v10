import { Controls, Time as TimePrimitive, Tooltip } from '@videojs/react';
import { FullscreenButton } from '@/components/videojs/fullscreen-button/fullscreen-button';
import { PlayButton } from '@/components/videojs/play-button/play-button';
import { SeekButton } from '@/components/videojs/seek-button/seek-button';
import { VolumePopover } from '@/components/videojs/volume-popover/volume-popover';
import { Container } from '@/components/videojs/container/container';
import { Overlay } from '@/components/videojs/overlay/overlay';
import { Poster } from '@/components/videojs/poster/poster';
import { TimeSlider } from '@/components/videojs/time-slider/time-slider';
import { cn } from '@videojs/utils/style';
import type { ReactNode } from 'react';
import type { ContainerProps, PosterProps } from '@videojs/react';

const SEEK_SECONDS = 10;

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

      <Controls.Root className="absolute inset-x-media-controls-gap bottom-media-controls-gap z-10 flex items-center gap-media-controls-gap rounded-media-pill p-media-controls-padding font-media text-media leading-none text-media-controls bg-media-surface shadow-media-surface backdrop-blur-media-surface">
        <Tooltip.Provider>
          <Controls.Group className="flex items-center gap-media-controls-gap">
            <PlayButton />
            <SeekButton seconds={-SEEK_SECONDS} />
            <SeekButton seconds={SEEK_SECONDS} />
          </Controls.Group>

          <Controls.Group className="flex flex-1 items-center gap-media-controls-gap">
            <TimePrimitive.Value className="tabular-nums" type="current" />
            <TimeSlider />
            <TimePrimitive.Value className="tabular-nums" type="remaining" toggle />
          </Controls.Group>

          <Controls.Group className="flex items-center gap-media-controls-gap">
            <VolumePopover />
            <FullscreenButton />
          </Controls.Group>
        </Tooltip.Provider>
      </Controls.Root>

      <Overlay />
    </Container>
  );
}

import { Controls } from '@/ui/controls';
import { Time as TimePrimitive } from '@/ui/time';
import { Tooltip } from '@/ui/tooltip';
import { FullscreenButton } from './components/buttons/fullscreen-button';
import { PlayButton } from './components/buttons/play-button';
import { SeekButton } from './components/buttons/seek-button';
import { VolumePopover } from './components/controls/volume-popover';
import { Container } from './components/layout/container';
import { Overlay } from './components/layout/overlay';
import { Poster } from './components/layout/poster';
import { TimeSlider } from './components/sliders/time-slider';
import { cn } from '@videojs/utils/style';
import type { ReactNode } from 'react';
import type { ContainerProps } from '@/player/container';
import type { PosterProps } from '@/ui/poster';

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

      <Controls.Root className="media-controls">
        <Tooltip.Provider>
          <Controls.Group className="media-controls-group-primary">
            <PlayButton />
            <SeekButton seconds={-SEEK_SECONDS} />
            <SeekButton seconds={SEEK_SECONDS} />
          </Controls.Group>

          <Controls.Group className="media-controls-group-time">
            <TimePrimitive.Value className="media-time" type="current" />
            <TimeSlider />
            <TimePrimitive.Value className="media-time" type="remaining" toggle />
          </Controls.Group>

          <Controls.Group className="media-controls-group-primary">
            <VolumePopover />
            <FullscreenButton />
          </Controls.Group>
        </Tooltip.Provider>
      </Controls.Root>

      <Overlay />
    </Container>
  );
}

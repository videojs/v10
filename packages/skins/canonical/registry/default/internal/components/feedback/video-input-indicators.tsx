import type { ComponentProps } from 'react';
import { SeekIndicator } from '@/components/videojs/seek-indicator/seek-indicator';
import { StatusAnnouncer } from '@/components/videojs/status-announcer/status-announcer';
import { PlaybackStatusIndicator, StatusIndicator } from '@/components/videojs/status-indicator/status-indicator';
import { VolumeIndicator } from '@/components/videojs/volume-indicator/volume-indicator';
import { cn } from '@/components/videojs/utils';

export interface VideoInputIndicatorsProps extends Omit<ComponentProps<'div'>, 'children'> {}

export function VideoInputIndicators({ className, ...props }: VideoInputIndicatorsProps = {}) {
  return (
    <>
      <StatusAnnouncer />
      <div
        {...props}
        className={cn(
          'pointer-events-none absolute inset-0 grid grid-cols-3 items-center justify-items-center text-white',
          className,
        )}
      >
        <VolumeIndicator />
        <StatusIndicator />
        <SeekIndicator />
        <PlaybackStatusIndicator />
      </div>
    </>
  );
}

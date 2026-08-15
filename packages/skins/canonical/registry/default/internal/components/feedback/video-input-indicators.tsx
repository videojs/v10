import { SeekIndicator } from '@/components/videojs/seek-indicator/seek-indicator';
import { StatusAnnouncer } from '@/components/videojs/status-announcer/status-announcer';
import { PlaybackStatusIndicator, StatusIndicator } from '@/components/videojs/status-indicator/status-indicator';
import { VolumeIndicator } from '@/components/videojs/volume-indicator/volume-indicator';

export function VideoInputIndicators() {
  return (
    <>
      <StatusAnnouncer />
      <div className="pointer-events-none absolute inset-0 grid grid-cols-3 items-center justify-items-center text-white">
        <VolumeIndicator />
        <StatusIndicator />
        <SeekIndicator />
        <PlaybackStatusIndicator />
      </div>
    </>
  );
}

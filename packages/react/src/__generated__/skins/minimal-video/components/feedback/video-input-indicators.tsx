import { SeekIndicator } from './seek-indicator';
import { StatusAnnouncer } from './status-announcer';
import { PlaybackStatusIndicator, StatusIndicator } from './status-indicator';
import { VolumeIndicator } from './volume-indicator';

export function VideoInputIndicators({
  variant = 'default',
}: {
  variant?: 'default' | 'minimal';
} = {}) {
  return (
    <>
      <StatusAnnouncer />
      <div className="media-input-indicator-overlay">
        <VolumeIndicator variant={variant} />
        <StatusIndicator variant={variant} />
        <SeekIndicator />
        <PlaybackStatusIndicator variant={variant} />
      </div>
    </>
  );
}

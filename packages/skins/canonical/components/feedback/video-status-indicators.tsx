import type { ComponentNode } from '@videojs/jsx';
import styles from '../../styles/components/status-indicator-overlay.tailwind';
import { SeekIndicator } from './seek-indicator';
import { StatusAnnouncer } from './status-announcer';
import { PlaybackStatusIndicator, StatusIndicator } from './status-indicator';
import { VolumeIndicator } from './volume-indicator';

declare const StatusIndicatorOverlayPrimitive: (props: { children?: unknown; className?: unknown }) => ComponentNode;

export function VideoStatusIndicators() {
  return (
    <>
      <StatusAnnouncer />
      <StatusIndicatorOverlayPrimitive className={styles.statusIndicatorOverlay}>
        <VolumeIndicator />
        <StatusIndicator />
        <SeekIndicator />
        <PlaybackStatusIndicator />
      </StatusIndicatorOverlayPrimitive>
    </>
  );
}

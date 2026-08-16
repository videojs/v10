import type { ComponentNode } from '@videojs/jsx';
import styles from '../../styles/components/input-indicator-overlay.tailwind';
import { SeekIndicator } from './seek-indicator';
import { StatusAnnouncer } from './status-announcer';
import { PlaybackStatusIndicator, StatusIndicator } from './status-indicator';
import { VolumeIndicator } from './volume-indicator';

declare const InputIndicatorOverlayPrimitive: (props: { children?: unknown; className?: unknown }) => ComponentNode;

export function VideoInputIndicators() {
  return (
    <>
      <StatusAnnouncer />
      <InputIndicatorOverlayPrimitive className={styles.inputIndicatorOverlay}>
        <VolumeIndicator />
        <StatusIndicator />
        <SeekIndicator />
        <PlaybackStatusIndicator />
      </InputIndicatorOverlayPrimitive>
    </>
  );
}

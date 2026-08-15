import type { ComponentNode } from '@videojs/jsx';
import styles from '../../styles/components/input-indicator-overlay.tailwind';
import { SeekIndicator } from './seek-indicator';
import { StatusAnnouncer } from './status-announcer';
import { PlaybackStatusIndicator, StatusIndicator } from './status-indicator';
import { VolumeIndicator } from './volume-indicator';

declare const InputIndicatorOverlayPrimitive: (props: { children?: unknown; className?: unknown }) => ComponentNode;

export function VideoInputIndicators({ variant = 'default' }: { variant?: 'default' | 'minimal' } = {}) {
  return (
    <>
      <StatusAnnouncer />
      <InputIndicatorOverlayPrimitive className={styles.inputIndicatorOverlay}>
        <VolumeIndicator variant={variant} />
        <StatusIndicator variant={variant} />
        <SeekIndicator />
        <PlaybackStatusIndicator variant={variant} />
      </InputIndicatorOverlayPrimitive>
    </>
  );
}

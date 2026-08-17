import type { ComponentNode } from '@videojs/jsx';
import styles from '../../styles/components/overlay.tailwind';

declare const OverlayPrimitive: (props: { className?: unknown }) => ComponentNode;

export function Overlay() {
  return <OverlayPrimitive className={styles.overlay} />;
}

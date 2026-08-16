import type { ComponentNode } from '@videojs/jsx';
import styles from '../../styles/components/overlay.tailwind';

declare const OverlayRoot: (props: { className?: unknown }) => ComponentNode;

export function Overlay() {
  return <OverlayRoot className={styles.overlay} />;
}

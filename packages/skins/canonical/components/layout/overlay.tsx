import type { ComponentProps, FunctionComponent } from '@videojs/jsx';
import styles from '../../styles/components/overlay.tailwind';

declare const OverlayRoot: FunctionComponent<ComponentProps>;

export function Overlay() {
  return <OverlayRoot className={styles.overlay} />;
}

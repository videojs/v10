import type { ComponentProps, FunctionComponent } from 'vjsc/components';
import styles from '../../styles/components/overlay.styles';

declare const OverlayRoot: FunctionComponent<ComponentProps>;

export function Overlay() {
  return <OverlayRoot className={styles.root} />;
}

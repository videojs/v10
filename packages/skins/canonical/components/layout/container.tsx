import * as $ from '@videojs/core/components';
import styles from '../../styles/components/container.styles';

export function Container({ children }: { children?: unknown }) {
  return <$.Container className={styles.root}>{children}</$.Container>;
}

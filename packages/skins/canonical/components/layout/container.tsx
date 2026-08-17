import { Container as ContainerPrimitive } from '@videojs/core/components';
import styles from '../../styles/components/container.styles';

export function Container({ children }: { children?: unknown }) {
  return <ContainerPrimitive className={styles.root}>{children}</ContainerPrimitive>;
}

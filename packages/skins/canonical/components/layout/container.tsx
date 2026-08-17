import { Container as ContainerPrimitive } from '@videojs/core/components';
import styles from '../../styles/components/container.tailwind';

export function Container({ children }: { children?: unknown }) {
  return <ContainerPrimitive className={styles.container}>{children}</ContainerPrimitive>;
}

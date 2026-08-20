import * as $ from '@videojs/core/vjsc';
import type { PropsWithChildren } from 'vjsc/components';
import styles from '../../styles/components/container.styles';

export function Container({ children, className, ...props }: PropsWithChildren) {
  return (
    <$.Container className={[styles.root, className]} {...props}>
      {children}
    </$.Container>
  );
}

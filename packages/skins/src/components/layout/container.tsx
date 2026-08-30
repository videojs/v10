import * as $ from '@videojs/core/vjsc';
import type { PropsWithChildren } from 'vjsc/components';

import type { SkinComponentMeta } from '../../meta';
import styles from '../../styles/layout/container.styles';

export function Container({ children, className, ...props }: PropsWithChildren) {
  return (
    <$.Container className={[styles.root, className]} {...props}>
      {children}
    </$.Container>
  );
}

export const meta = {
  name: 'container',
  type: 'component',
  title: 'Container',
  description: 'The player layout container shared by Skin compositions.',
} as const satisfies SkinComponentMeta;

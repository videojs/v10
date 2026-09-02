import * as $ from '@videojs/core/vjsc';
import type { PropsWithChildren } from 'vjsc/components';

import type { SkinComponentDescription } from '../../meta';
import styles from '../../styles/layout/container.styles';

export function Container({ children, className, ...props }: PropsWithChildren) {
  return (
    <$.Container className={[styles.skin, styles.root, className]} {...props}>
      {children}
    </$.Container>
  );
}

export const meta = {
  title: 'Container',
  description: 'The player layout container shared by Skin compositions.',
} as const satisfies SkinComponentDescription;

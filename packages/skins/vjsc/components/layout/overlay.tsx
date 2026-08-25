import { Group, type Props } from 'vjsc/components';

import type { SkinComponentMeta } from '../../meta';
import styles from '../../styles/components/overlay.styles';

export function Overlay({ className, ...props }: Props = {}) {
  return <Group className={[styles.root, className]} {...props} />;
}

export const meta = {
  name: 'overlay',
  type: 'component',
  title: 'Overlay',
  description: 'The inert video scrim rendered behind visible controls and feedback UI.',
} as const satisfies SkinComponentMeta;

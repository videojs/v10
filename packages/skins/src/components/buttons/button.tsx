import { defineRenderTarget } from 'vjsc/components';

import type { SkinComponentDescription } from '../../meta';
import styles from '../../styles/buttons/button.styles';

/** Shared button carrying the base interactive styles used by media controls. */
export const Button = defineRenderTarget([styles.root]);

export const meta = {
  title: 'Button',
  description: 'The shared styled button used by media controls.',
} as const satisfies SkinComponentDescription;

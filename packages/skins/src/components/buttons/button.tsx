import type { SkinComponentMeta } from '../../meta';
import { defineRenderTarget } from '../../render-target';
import styles from '../../styles/buttons/button.styles';

/** Shared button carrying the base interactive styles used by media controls. */
export const Button = defineRenderTarget('Button', [styles.root]);

export const meta = {
  name: 'button',
  type: 'component',
  title: 'Button',
  description: 'The shared styled button used by media controls.',
} as const satisfies SkinComponentMeta;

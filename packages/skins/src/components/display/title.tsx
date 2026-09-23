import * as $ from '@videojs/core/vjsc';
import { type Props } from 'vjsc/components';

import type { SkinComponentDescription } from '../../meta';
import styles from '../../styles/display/title.styles';

export function Title({ className, ...props }: Props = {}) {
  return <$.Title className={[styles.root, className]} {...props} />;
}

export const meta = {
  title: 'Title',
  description: 'The media title, displayed above the video while controls are visible.',
} as const satisfies SkinComponentDescription;

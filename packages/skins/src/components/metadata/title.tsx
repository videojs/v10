import * as $ from '@videojs/core/vjsc';
import { type Props } from 'vjsc/components';

import type { SkinComponentDescription } from '../../meta';
import styles from '../../styles/metadata/title.styles';

export function Title({ className, ...props }: Props = {}) {
  return (
    <$.Title.Root className={[styles.root, className]} {...props}>
      <$.Title.Value className={styles.content} />
    </$.Title.Root>
  );
}

export const meta = {
  title: 'Title',
  description: 'The media title, displayed above the video while controls are visible.',
} as const satisfies SkinComponentDescription;

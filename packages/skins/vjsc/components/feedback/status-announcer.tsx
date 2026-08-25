import type { StatusAnnouncerProps as CoreProps } from '@videojs/core';
import * as $ from '@videojs/core/vjsc';
import type { Props } from 'vjsc/components';

import type { SkinComponentMeta } from '../../meta';
import styles from '../../styles/feedback/status-announcer.styles';

export function StatusAnnouncer({ className, ...props }: Props<CoreProps> = {}) {
  return <$.StatusAnnouncer className={[styles.root, className]} {...props} />;
}

export const meta = {
  name: 'status-announcer',
  type: 'component',
  title: 'Status Announcer',
  description: 'A polite live region that announces media state changes.',
} as const satisfies SkinComponentMeta;

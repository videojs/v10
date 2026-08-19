import type { StatusAnnouncerProps as CoreProps } from '@videojs/core';
import * as $ from '@videojs/core/vjsc';
import type { Props } from 'vjsc/components';
import styles from '../../styles/components/status-announcer.styles';

export function StatusAnnouncer({ className, ...props }: Props<CoreProps> = {}) {
  return <$.StatusAnnouncer className={[styles.root, className]} {...props} />;
}

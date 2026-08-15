import { StatusAnnouncer as StatusAnnouncerPrimitive } from '@videojs/core/components';
import styles from '../../styles/components/status-announcer.tailwind';

export function StatusAnnouncer() {
  return <StatusAnnouncerPrimitive className={styles.statusAnnouncer} />;
}

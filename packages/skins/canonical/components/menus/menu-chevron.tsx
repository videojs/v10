import { ChevronIcon } from '@videojs/icons/components';
import styles from '../../styles/components/menu.tailwind';

export function MenuChevron({ flipped = false }: { flipped?: boolean } = {}) {
  return (
    <ChevronIcon
      className={flipped ? [styles.icon, styles.chevron, styles.chevronFlipped] : [styles.icon, styles.chevron]}
    />
  );
}

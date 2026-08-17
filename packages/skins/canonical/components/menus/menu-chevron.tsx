import { ChevronIcon } from '@videojs/icons/components';
import styles from '../../styles/components/menu.styles';

export function MenuChevron({ flipped = false }: { flipped?: boolean } = {}) {
  return (
    <ChevronIcon
      className={flipped ? [styles.icon, styles.chevron, styles.flippedChevron] : [styles.icon, styles.chevron]}
    />
  );
}

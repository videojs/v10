import { ChevronIcon } from '@videojs/icons/components';
import styles from '../../styles/components/menu.styles';

export function MenuChevron({ flipped = false }: { flipped?: boolean } = {}) {
  return <ChevronIcon className={[styles.icon, styles.chevron, flipped ? styles.flippedChevron : undefined]} />;
}

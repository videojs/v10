import { ChevronIcon } from '@videojs/icons/vjsc';
import type { Props } from 'vjsc/components';
import styles from '../../styles/components/menu.styles';

export function MenuChevron({ flipped = false, className, ...props }: Props<{ flipped?: boolean }> = {}) {
  return (
    <ChevronIcon
      className={[styles.icon, styles.chevron, flipped ? styles.flippedChevron : undefined, className]}
      {...props}
    />
  );
}

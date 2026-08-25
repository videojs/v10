import { ChevronIcon } from '@videojs/icons/vjsc';
import type { Props } from 'vjsc/components';

import styles from '../../styles/menus/menu.styles';

export function MenuChevron({ back = false, className, ...props }: Props<{ back?: boolean }> = {}) {
  return <ChevronIcon className={[back ? styles.backChevron : styles.forwardChevron, className]} {...props} />;
}

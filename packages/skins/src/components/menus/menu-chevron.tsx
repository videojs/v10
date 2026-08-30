import { ChevronIcon } from '@videojs/icons/vjsc';
import type { ClassNameValue } from 'vjsc/components';

import styles from '../../styles/menus/menu.styles';

export interface MenuChevronProps {
  back?: boolean;
  className?: ClassNameValue;
}

export function MenuChevron({ back = false, className }: MenuChevronProps = {}) {
  return <ChevronIcon className={[back ? styles.backChevron : styles.forwardChevron, className]} />;
}

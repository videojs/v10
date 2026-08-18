import * as $ from '@videojs/core/components';
import { type Props, Slot } from 'vjsc/components';
import styles from '../../styles/components/poster.styles';

export function Poster({ className, ...props }: Props = {}) {
  return (
    <$.Poster className={[styles.root, className]} {...props}>
      <Slot name="poster" />
    </$.Poster>
  );
}

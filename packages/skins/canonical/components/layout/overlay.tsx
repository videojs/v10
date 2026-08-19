import { Group, type Props } from 'vjsc/components';
import styles from '../../styles/components/overlay.styles';

export function Overlay({ className, ...props }: Props = {}) {
  return <Group className={[styles.root, className]} {...props} />;
}

import * as $ from '@videojs/core/vjsc';
import type { Props } from 'vjsc/components';
import buttonStyles from '../../styles/components/button.styles';
import styles from '../../styles/components/error-dialog.styles';

export function ErrorDialog({ className, ...props }: Props = {}) {
  return (
    <$.ErrorDialog.Root>
      <$.ErrorDialog.Popup className={[styles.root, className]} {...props}>
        <$.ErrorDialog.Title className={styles.title} />
        <$.ErrorDialog.Description className={styles.description} />
        <$.ErrorDialog.Close className={[buttonStyles.root, styles.close]} />
      </$.ErrorDialog.Popup>
    </$.ErrorDialog.Root>
  );
}

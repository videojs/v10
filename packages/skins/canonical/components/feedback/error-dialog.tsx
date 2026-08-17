import * as $ from '@videojs/core/components';
import buttonStyles from '../../styles/components/button.styles';
import styles from '../../styles/components/error-dialog.styles';

export function ErrorDialog() {
  return (
    <$.ErrorDialog.Root>
      <$.ErrorDialog.Popup className={styles.root}>
        <$.ErrorDialog.Title className={styles.title} />
        <$.ErrorDialog.Description className={styles.description} />
        <$.ErrorDialog.Close className={[buttonStyles.root, styles.close]} />
      </$.ErrorDialog.Popup>
    </$.ErrorDialog.Root>
  );
}

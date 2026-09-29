import * as $ from '@videojs/core/vjsc';

import { Button } from './button';
import styles from './skin.styles';

export function ErrorDialog() {
  return (
    <$.ErrorDialog.Root>
      <$.ErrorDialog.Backdrop className={styles.dialogBackdrop} />
      <$.ErrorDialog.Popup className={styles.dialogPopup}>
        <$.ErrorDialog.Title className={styles.dialogTitle} />
        <$.ErrorDialog.Description className={styles.dialogDescription} />
        <$.ErrorDialog.Close $render={Button} className={styles.dialogClose} />
      </$.ErrorDialog.Popup>
    </$.ErrorDialog.Root>
  );
}

import * as $ from '@videojs/core/vjsc';
import { Box, type Props } from 'vjsc/components';

import { Button } from '../../components/buttons/button';
import styles from './error-dialog.styles';

export function AudioErrorDialog({ className, ...props }: Props = {}) {
  return (
    <$.ErrorDialog.Root className={styles.root}>
      <$.ErrorDialog.Backdrop className={styles.backdrop} />
      <$.ErrorDialog.Popup className={[styles.popup, className]} {...props}>
        <Box className={styles.content}>
          <$.ErrorDialog.Title className={styles.title} />
          <$.ErrorDialog.Description className={styles.description} />
        </Box>
        <Box className={styles.actions}>
          <$.ErrorDialog.Close $render={Button} className={styles.close} />
        </Box>
      </$.ErrorDialog.Popup>
    </$.ErrorDialog.Root>
  );
}

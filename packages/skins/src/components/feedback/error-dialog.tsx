import * as $ from '@videojs/core/vjsc';
import { Box, type Props } from 'vjsc/components';

import type { SkinComponentMeta } from '../../meta';
import styles from '../../styles/popups/dialog.styles';
import { Button } from '../buttons/button';

export function ErrorDialog({ className, ...props }: Props = {}) {
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

export const meta = {
  name: 'error-dialog',
  type: 'component',
  title: 'Error Dialog',
  description: 'An alert dialog that presents and dismisses playback errors.',
} as const satisfies SkinComponentMeta;

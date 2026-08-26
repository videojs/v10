import * as $ from '@videojs/core/vjsc';
import { Box, type Props } from 'vjsc/components';

import type { SkinComponentMeta } from '../../meta';
import buttonStyles from '../../styles/buttons/button.styles';
import styles from '../../styles/popups/dialog.styles';
import surfaceStyles from '../../styles/surfaces/surface.styles';

export function ErrorDialog({ className, ...props }: Props = {}) {
  return (
    <$.ErrorDialog.Root className={styles.root}>
      <$.ErrorDialog.Backdrop className={styles.backdrop} />
      <$.ErrorDialog.Popup
        className={[surfaceStyles.feedback, styles.popup, 'media-dialog-popup', className]}
        {...props}
      >
        <Box className={styles.content}>
          <$.ErrorDialog.Title className={styles.title} />
          <$.ErrorDialog.Description className={styles.description} />
        </Box>
        <Box className={styles.actions}>
          <$.ErrorDialog.Close className={[buttonStyles.root, styles.close]} />
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

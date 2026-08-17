import { ErrorDialog as ErrorDialogPrimitive } from '@videojs/core/components';
import buttonStyles from '../../styles/components/button.styles';
import styles from '../../styles/components/error-dialog.styles';

export function ErrorDialog() {
  return (
    <ErrorDialogPrimitive.Root>
      <ErrorDialogPrimitive.Popup className={styles.root}>
        <ErrorDialogPrimitive.Title className={styles.title} />
        <ErrorDialogPrimitive.Description className={styles.description} />
        <ErrorDialogPrimitive.Close className={[buttonStyles.root, styles.close]} />
      </ErrorDialogPrimitive.Popup>
    </ErrorDialogPrimitive.Root>
  );
}

import { ErrorDialog as ErrorDialogPrimitive } from '@videojs/core/components';
import buttonStyles from '../../styles/components/button.tailwind';
import styles from '../../styles/components/error-dialog.tailwind';
import popupStyles from '../../styles/components/popup.tailwind';

export function ErrorDialog() {
  return (
    <ErrorDialogPrimitive.Root>
      <ErrorDialogPrimitive.Popup className={[popupStyles.surface, styles.errorDialog]}>
        <ErrorDialogPrimitive.Title className={styles.errorDialogTitle} />
        <ErrorDialogPrimitive.Description className={styles.errorDialogDescription} />
        <ErrorDialogPrimitive.Close className={[buttonStyles.button, styles.errorDialogClose]} />
      </ErrorDialogPrimitive.Popup>
    </ErrorDialogPrimitive.Root>
  );
}

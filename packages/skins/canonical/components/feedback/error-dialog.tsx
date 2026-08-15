import { ErrorDialog as ErrorDialogPrimitive } from '@videojs/core/components';
import buttonStyles from '../../styles/components/button.tailwind';
import styles from '../../styles/components/error-dialog.tailwind';
import popupStyles from '../../styles/components/popup.tailwind';

export function ErrorDialog({ variant = 'default' }: { variant?: 'default' | 'minimal' } = {}) {
  return (
    <ErrorDialogPrimitive.Root>
      <ErrorDialogPrimitive.Popup
        className={
          variant === 'minimal'
            ? [popupStyles.surface, styles.errorDialog, styles.errorDialogMinimal]
            : [popupStyles.surface, styles.errorDialog]
        }
      >
        <ErrorDialogPrimitive.Title
          className={
            variant === 'minimal' ? [styles.errorDialogTitle, styles.errorDialogTitleMinimal] : styles.errorDialogTitle
          }
        />
        <ErrorDialogPrimitive.Description
          className={
            variant === 'minimal'
              ? [styles.errorDialogDescription, styles.errorDialogDescriptionMinimal]
              : styles.errorDialogDescription
          }
        />
        <ErrorDialogPrimitive.Close
          className={
            variant === 'minimal'
              ? [buttonStyles.button, styles.errorDialogClose, styles.errorDialogCloseMinimal]
              : [buttonStyles.button, styles.errorDialogClose]
          }
        />
      </ErrorDialogPrimitive.Popup>
    </ErrorDialogPrimitive.Root>
  );
}

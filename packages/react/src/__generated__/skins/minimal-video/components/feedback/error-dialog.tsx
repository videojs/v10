import { ErrorDialog as ErrorDialogPrimitive } from '@/ui/error-dialog';

export function ErrorDialog({
  variant = 'default',
}: {
  variant?: 'default' | 'minimal';
} = {}) {
  return (
    <ErrorDialogPrimitive.Root>
      <ErrorDialogPrimitive.Popup
        className={
          variant === 'minimal'
            ? 'media-surface media-error-dialog media-error-dialog-minimal'
            : 'media-surface media-error-dialog'
        }
      >
        <ErrorDialogPrimitive.Title
          className={
            variant === 'minimal'
              ? 'media-error-dialog-title media-error-dialog-title-minimal'
              : 'media-error-dialog-title'
          }
        />
        <ErrorDialogPrimitive.Description
          className={
            variant === 'minimal'
              ? 'media-error-dialog-description media-error-dialog-description-minimal'
              : 'media-error-dialog-description'
          }
        />
        <ErrorDialogPrimitive.Close
          className={
            variant === 'minimal'
              ? 'media-button media-error-dialog-close media-error-dialog-close-minimal'
              : 'media-button media-error-dialog-close'
          }
        />
      </ErrorDialogPrimitive.Popup>
    </ErrorDialogPrimitive.Root>
  );
}

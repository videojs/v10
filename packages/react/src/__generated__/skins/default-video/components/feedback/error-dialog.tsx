import { ErrorDialog as ErrorDialogPrimitive } from '@/ui/error-dialog';

export function ErrorDialog() {
  return (
    <ErrorDialogPrimitive.Root>
      <ErrorDialogPrimitive.Popup className="media-surface media-error-dialog">
        <ErrorDialogPrimitive.Title className="media-error-dialog-title" />
        <ErrorDialogPrimitive.Description className="media-error-dialog-description" />
        <ErrorDialogPrimitive.Close className="media-button media-error-dialog-close" />
      </ErrorDialogPrimitive.Popup>
    </ErrorDialogPrimitive.Root>
  );
}

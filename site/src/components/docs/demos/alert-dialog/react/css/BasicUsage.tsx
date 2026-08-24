import { AlertDialog, Dialog } from '@videojs/react';
import { useState } from 'react';

export default function BasicUsage() {
  const [open, setOpen] = useState(false);

  return (
    <div className="react-alert-dialog-basic">
      <button className="react-alert-dialog-basic__trigger" type="button" onClick={() => setOpen(true)}>
        Open alert dialog
      </button>
      <AlertDialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Popup className="react-alert-dialog-basic__dialog">
          <Dialog.Title className="react-alert-dialog-basic__title">Stop playback?</Dialog.Title>
          <Dialog.Description className="react-alert-dialog-basic__description">
            Your current playback position will be lost.
          </Dialog.Description>
          <Dialog.Close className="react-alert-dialog-basic__close">Continue</Dialog.Close>
        </Dialog.Popup>
      </AlertDialog.Root>
    </div>
  );
}

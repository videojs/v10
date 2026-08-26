import { AlertDialog } from '@videojs/react';
import { useState } from 'react';

export default function BasicUsage() {
  const [open, setOpen] = useState(false);

  return (
    <div className="react-alert-dialog-basic">
      <button className="react-alert-dialog-basic__trigger" type="button" onClick={() => setOpen(true)}>
        Open alert dialog
      </button>
      <AlertDialog.Root open={open} onOpenChange={setOpen}>
        <AlertDialog.Backdrop className="react-alert-dialog-basic__backdrop" />
        <AlertDialog.Popup className="react-alert-dialog-basic__dialog">
          <AlertDialog.Title className="react-alert-dialog-basic__title">Stop playback?</AlertDialog.Title>
          <AlertDialog.Description className="react-alert-dialog-basic__description">
            Your current playback position will be lost.
          </AlertDialog.Description>
          <AlertDialog.Close className="react-alert-dialog-basic__close">Continue</AlertDialog.Close>
        </AlertDialog.Popup>
      </AlertDialog.Root>
    </div>
  );
}

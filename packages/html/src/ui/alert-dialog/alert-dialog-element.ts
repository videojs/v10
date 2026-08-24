import { AlertDialogCore, AlertDialogDataAttrs } from '@videojs/core';

import { DialogElementBase } from '../dialog/dialog-element';

/** A modal dialog with alert semantics. */
export class AlertDialogElement extends DialogElementBase {
  static readonly tagName = 'media-alert-dialog';

  constructor() {
    super({
      core: new AlertDialogCore(),
      stateAttrMap: AlertDialogDataAttrs,
      idPrefix: 'alert-dialog',
      bindTrigger: false,
    });
  }
}

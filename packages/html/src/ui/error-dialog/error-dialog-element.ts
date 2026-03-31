import { AlertDialogCore, AlertDialogDataAttrs, type AlertDialogInput } from '@videojs/core';
import {
  type AlertDialogApi,
  applyElementProps,
  applyStateDataAttrs,
  createAlertDialog,
  createTransition,
  selectError,
} from '@videojs/core/dom';
import type { PropertyValues } from '@videojs/element';
import { ContextProvider } from '@videojs/element/context';
import { SnapshotController } from '@videojs/store/html';

import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { alertDialogContext } from '../alert-dialog/context';
import { MediaElement } from '../media-element';

const DEFAULT_ERROR_MESSAGE = 'An error occurred. Please try again.';

let idCounter = 0;

/**
 * Self-contained error dialog that subscribes to the player's error state
 * and shows/hides an alert dialog automatically. Provides `alertDialogContext`
 * so child `media-alert-dialog-*` elements work as expected.
 */
export class ErrorDialogElement extends MediaElement {
  static readonly tagName = 'media-error-dialog';

  readonly #core = new AlertDialogCore();
  readonly #provider = new ContextProvider(this, { context: alertDialogContext });
  readonly #titleId = `vjs-error-dialog-title-${idCounter++}`;
  readonly #descriptionId = `vjs-error-dialog-desc-${idCounter++}`;
  readonly #errorState = new PlayerController(this, playerContext, selectError);

  #dialog: AlertDialogApi | null = null;
  #snapshot: SnapshotController<AlertDialogInput> | null = null;
  #lastErrorMessage: string = '';

  constructor() {
    super();
    this.#core.setTitleId(this.#titleId);
    this.#core.setDescriptionId(this.#descriptionId);
  }

  override connectedCallback(): void {
    super.connectedCallback();

    this.#dialog = createAlertDialog({
      transition: createTransition(),
      onOpenChange: (open: boolean) => {
        if (!open) {
          this.#errorState.value?.dismissError();
        }
      },
    });

    this.#dialog.setElement(this);

    if (this.#snapshot) {
      this.#snapshot.track(this.#dialog.input);
    } else {
      this.#snapshot = new SnapshotController(this, this.#dialog.input);
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#dialog?.destroy();
    this.#dialog = null;
  }

  protected override update(_changed: PropertyValues): void {
    super.update(_changed);
    if (!this.#dialog) return;

    const errorState = this.#errorState.value;
    const hasError = Boolean(errorState?.error);

    if (errorState?.error) {
      this.#lastErrorMessage = errorState.error.message || DEFAULT_ERROR_MESSAGE;
    }

    // Sync dialog open/close with error presence.
    const { active: isOpen } = this.#dialog.input.current;
    if (hasError && !isOpen) {
      this.#dialog.open();
    } else if (!hasError && isOpen) {
      this.#dialog.close();
    }

    const input = this.#dialog.input.current;
    this.#core.setInput(input);
    const state = this.#core.getState();

    applyElementProps(this, this.#core.getAttrs(state));
    applyStateDataAttrs(this, state, AlertDialogDataAttrs);

    this.#provider.setValue({
      state,
      stateAttrMap: AlertDialogDataAttrs,
      close: () => this.#dialog?.close(),
    });

    // Push the error message into the description element.
    const desc = this.querySelector('media-alert-dialog-description');
    if (desc && this.#lastErrorMessage) {
      desc.textContent = this.#lastErrorMessage;
    }
  }
}

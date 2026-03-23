import { AlertDialogDataAttrs, type AlertDialogInput, ErrorDialogCore } from '@videojs/core';
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

const FALLBACK_MESSAGE = 'An error occurred. Please try again.';

let idCounter = 0;

export class ErrorDialogElement extends MediaElement {
  static readonly tagName = 'media-error-dialog';

  readonly #core = new ErrorDialogCore();
  readonly #provider = new ContextProvider(this, { context: alertDialogContext });
  readonly #titleId = `vjs-error-dialog-title-${idCounter++}`;
  readonly #descriptionId = `vjs-error-dialog-desc-${idCounter++}`;
  readonly #errorState = new PlayerController(this, playerContext, selectError);

  #dialog: AlertDialogApi | null = null;
  #snapshot: SnapshotController<AlertDialogInput> | null = null;
  #lastErrorMessage: string | null = null;

  constructor() {
    super();
    this.#core.setTitleId(this.#titleId);
    this.#core.setDescriptionId(this.#descriptionId);
  }

  override connectedCallback(): void {
    super.connectedCallback();

    this.#dialog = createAlertDialog({
      transition: createTransition(),
      onOpenChange: (nextOpen: boolean) => {
        if (!nextOpen) {
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

  protected override willUpdate(_changed: PropertyValues): void {
    super.willUpdate(_changed);
    if (!this.#dialog) return;

    const errorState = this.#errorState.value;
    const hasError = Boolean(errorState?.error);
    const { active: isOpen } = this.#dialog.input.current;

    if (errorState?.error) {
      const message = errorState.error.message?.trim();
      this.#lastErrorMessage = message || null;
    }

    // Set description text before opening so content is ready for the transition.
    const desc = this.querySelector('media-alert-dialog-description');
    if (desc) {
      desc.textContent = this.#lastErrorMessage ?? FALLBACK_MESSAGE;
    }

    if (hasError && !isOpen) {
      this.#dialog.open();
    } else if (!hasError && isOpen) {
      this.#dialog.close();
    }
  }

  protected override update(_changed: PropertyValues): void {
    super.update(_changed);
    if (!this.#dialog) return;

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
  }
}

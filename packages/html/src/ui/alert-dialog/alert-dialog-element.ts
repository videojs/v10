import { AlertDialogCore, AlertDialogDataAttrs, type AlertDialogInput } from '@videojs/core';
import {
  type AlertDialogApi,
  applyElementProps,
  applyStateDataAttrs,
  createAlertDialog,
  createTransition,
} from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';
import { ContextProvider } from '@videojs/element/context';
import { SnapshotController } from '@videojs/store/html';

import { MediaElement } from '../media-element';
import { alertDialogContext } from './context';

let idCounter = 0;

export class AlertDialogElement extends MediaElement {
  static readonly tagName = 'media-alert-dialog';

  static override properties = {
    open: { type: Boolean },
  } satisfies PropertyDeclarationMap<'open'>;

  open = false;

  readonly #core = new AlertDialogCore();
  readonly #provider = new ContextProvider(this, { context: alertDialogContext });
  readonly #titleId = `vjs-alert-dialog-title-${idCounter++}`;
  readonly #descriptionId = `vjs-alert-dialog-desc-${idCounter++}`;

  #dialog: AlertDialogApi | null = null;
  #snapshot: SnapshotController<AlertDialogInput> | null = null;

  constructor() {
    super();
    this.#core.setTitleId(this.#titleId);
    this.#core.setDescriptionId(this.#descriptionId);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.destroyed) return;

    this.#dialog = createAlertDialog({
      transition: createTransition(),
      onOpenChange: (nextOpen: boolean) => {
        this.open = nextOpen;
        this.dispatchEvent(new CustomEvent('open-change', { detail: { open: nextOpen } }));
      },
    });

    // Register self as the dialog element.
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

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);

    // Sync controlled open state.
    if (this.#dialog && changed.has('open')) {
      const { active: inputOpen } = this.#dialog.input.current;
      if (this.open !== inputOpen) {
        if (this.open) {
          this.#dialog.open();
        } else {
          this.#dialog.close();
        }
      }
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

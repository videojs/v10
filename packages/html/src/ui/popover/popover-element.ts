import { PopoverCore, type PopoverProps, type PopoverRootProps } from '@videojs/core';
import { createPopover, type Popover, type PopoverChangeDetails } from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';
import { ContextProvider } from '@videojs/element/context';

import { MediaElement } from '../media-element';
import { type PopoverContextValue, popoverContext } from './popover-context';

let popoverCounter = 0;

export class PopoverElement extends MediaElement {
  static readonly tagName = 'media-popover';

  static override properties = {
    open: { type: Boolean },
    defaultOpen: { type: Boolean, attribute: 'default-open' },
    side: { type: String },
    align: { type: String },
    sideOffset: { type: Number, attribute: 'side-offset' },
    alignOffset: { type: Number, attribute: 'align-offset' },
    modal: { type: String },
    closeOnEscape: { type: Boolean, attribute: 'close-on-escape' },
    closeOnOutsideClick: { type: Boolean, attribute: 'close-on-outside-click' },
    openOnHover: { type: Boolean, attribute: 'open-on-hover' },
    delay: { type: Number },
    closeDelay: { type: Number, attribute: 'close-delay' },
  } satisfies PropertyDeclarationMap<keyof PopoverRootProps>;

  // Controlled/uncontrolled
  open = false;
  defaultOpen = false;

  // Core props
  side = PopoverCore.defaultProps.side;
  align = PopoverCore.defaultProps.align;
  sideOffset = PopoverCore.defaultProps.sideOffset;
  alignOffset = PopoverCore.defaultProps.alignOffset;
  modal: PopoverProps['modal'] = PopoverCore.defaultProps.modal;
  closeOnEscape = PopoverCore.defaultProps.closeOnEscape;
  closeOnOutsideClick = PopoverCore.defaultProps.closeOnOutsideClick;

  // Hover props
  openOnHover = false;
  delay = 300;
  closeDelay = 0;

  readonly #core = new PopoverCore();
  #popover: Popover | null = null;

  #provider = new ContextProvider(this, {
    context: popoverContext,
    initialValue: undefined as unknown as PopoverContextValue,
  });

  #anchorName = `popover-${++popoverCounter}`;
  #popupId = `media-popover-popup-${popoverCounter}`;

  override connectedCallback(): void {
    super.connectedCallback();

    this.#popover = createPopover({
      onOpenChange: (nextOpen: boolean, details: PopoverChangeDetails) => {
        this.open = nextOpen;
        this.dispatchEvent(new CustomEvent('open-change', { detail: { open: nextOpen, ...details } }));
      },
      closeOnEscape: () => this.closeOnEscape,
      closeOnOutsideClick: () => this.closeOnOutsideClick,
      openOnHover: () => this.openOnHover,
      delay: () => this.delay,
      closeDelay: () => this.closeDelay,
    });

    this.#provider.setValue({
      core: this.#core,
      popover: this.#popover,
      interaction: this.#popover.interaction,
      anchorName: this.#anchorName,
      popupId: this.#popupId,
    });

    // Determine initial open state: controlled mode uses the `open` attribute,
    // uncontrolled mode uses `defaultOpen`.
    const isControlled = this.hasAttribute('open');
    const shouldOpen = isControlled ? this.open : this.defaultOpen;

    if (shouldOpen) {
      this.#popover.open();
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#popover?.destroy();
    this.#popover = null;
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    this.#core.setProps(this);

    // Sync controlled open state
    if (this.#popover && changed.has('open')) {
      const { open: interactionOpen } = this.#popover.interaction.current;
      if (this.open !== interactionOpen) {
        if (this.open) {
          this.#popover.open();
        } else {
          this.#popover.close();
        }
      }
    }
  }

  protected override update(_changed: PropertyValues): void {
    super.update(_changed);
    // Root element doesn't render — children consume context
  }
}

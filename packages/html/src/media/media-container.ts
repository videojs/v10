import type { Constructor, CustomElement } from '@open-wc/context-protocol';

import { ConsumerMixin } from '@open-wc/context-protocol';

export function getTemplateHTML() {
  return /* html */ `
    <slot name="media"></slot>
    <slot></slot>
  `;
}

const CustomElementConsumer: Constructor<CustomElement & HTMLElement> = ConsumerMixin(HTMLElement);

export class MediaContainerElement extends CustomElementConsumer {
  static shadowRootOptions = { mode: 'open' as ShadowRootMode };
  static getTemplateHTML: () => string = getTemplateHTML;

  _playerStore: any;
  _mediaSlot: HTMLSlotElement;
  _paused: boolean = true;
  contexts = {
    playerStore: (playerStore: any): void => {
      this._playerStore = playerStore;
      this._handleMediaSlotChange();
      this._registerContainerStateOwner();
      this._subscribeToPlayState();
    },
  };

  constructor() {
    super();

    if (!this.shadowRoot) {
      this.attachShadow((this.constructor as typeof MediaContainerElement).shadowRootOptions);
      this.shadowRoot!.innerHTML = (this.constructor as typeof MediaContainerElement).getTemplateHTML();
    }

    this._mediaSlot = this.shadowRoot!.querySelector('slot[name=media]') as HTMLSlotElement;
    this._mediaSlot.addEventListener('slotchange', this._handleMediaSlotChange);

    // Add click handler for play/pause functionality
    this.addEventListener('click', this._handleClick);
  }

  connectedCallback(): void {
    super.connectedCallback?.();
    this._registerContainerStateOwner();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback?.();
    this._unregisterContainerStateOwner();
  }

  _registerContainerStateOwner = (): void => {
    if (!this._playerStore) return;
    this._playerStore.attach({ container: this });
  };

  _unregisterContainerStateOwner = (): void => {
    if (!this._playerStore) return;
    this._playerStore.attach({ container: null });
  };

  _handleMediaSlotChange = (): void => {
    const media = this._mediaSlot.assignedElements({ flatten: true })[0];
    this._playerStore.attach({ media });
  };

  _handleClick = (event: Event): void => {
    if (!this._playerStore) return;

    if (!/(video|audio)$/.test((event.target as HTMLElement).localName)) return;

    if (this._paused) {
      this._playerStore.getState().play();
    } else {
      this._playerStore.getState().pause();
    }
  };

  _subscribeToPlayState = (): void => {
    if (!this._playerStore) return;

    // Subscribe to paused state changes
    this._playerStore.subscribe((state: any) => {
      this._paused = state.paused ?? true;
    });
  };
}

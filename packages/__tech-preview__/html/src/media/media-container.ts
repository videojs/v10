import type { Constructor, CustomElement } from '@open-wc/context-protocol';

import { ConsumerMixin } from '@open-wc/context-protocol';

export function getTemplateHTML() {
  return /* html */ `
    <slot name="media"></slot>
    <slot></slot>
  `;
}

export const Attributes = {
  // Inputs
  AUTOHIDE: 'autohide',
  AUTOHIDE_OVER_CONTROLS: 'autohideovercontrols',
  // Output
  CONTROLS_VISIBILITY: 'data-controls',
} as const;

const DEFAULT_AUTOHIDE = 2000; // 2 seconds

const CustomElementConsumer: Constructor<CustomElement & HTMLElement> = ConsumerMixin(HTMLElement);

export class MediaContainerElement extends CustomElementConsumer {
  static shadowRootOptions = { mode: 'open' as ShadowRootMode };
  static getTemplateHTML: () => string = getTemplateHTML;

  static get observedAttributes(): string[] {
    return [Attributes.AUTOHIDE];
  }

  _mediaStore: any;
  _mediaSlot: HTMLSlotElement;
  _paused: boolean = true;
  contexts = {
    mediaStore: (mediaStore: any): void => {
      this._mediaStore = mediaStore;
      this._handleMediaSlotChange();
      this._registerContainerStateOwner();
      this._subscribeToPlayState();
    },
  };

  _pointerDownTimeStamp = 0;
  _inactiveTimeout: ReturnType<typeof setTimeout> | undefined = undefined;
  _autohide: number = DEFAULT_AUTOHIDE;
  _isUserActive: boolean = true;

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

    // Add handlers for user activity detection
    this.addEventListener('pointerdown', this._handlePointerDown);
    this.addEventListener('pointermove', this._handlePointerMove);
    this.addEventListener('pointerup', this._handlePointerUp);
    this.addEventListener('mouseleave', this._setUserInactive);
    this.addEventListener('keyup', this._scheduleUserInactive);
  }

  connectedCallback(): void {
    super.connectedCallback?.();
    this._registerContainerStateOwner();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback?.();
    this._unregisterContainerStateOwner();
  }

  attributeChangedCallback(
    attrName: string,
    _oldValue: string,
    newValue: string,
  ): void {
    if (attrName.toLowerCase() === Attributes.AUTOHIDE) {
      this.autohide = newValue;
    }
  }

  _registerContainerStateOwner = (): void => {
    if (!this._mediaStore) return;
    this._mediaStore.dispatch({ type: 'containerstateownerchangerequest', detail: this });
  };

  _unregisterContainerStateOwner = (): void => {
    if (!this._mediaStore) return;
    this._mediaStore.dispatch({ type: 'containerstateownerchangerequest', detail: null });
  };

  _getMediaElement = (): HTMLMediaElement | null => {
    const media = this._mediaSlot.assignedElements({ flatten: true })[0];
    if (media && (media instanceof HTMLMediaElement)) {
      return media;
    }
    return null;
  };

  _handleMediaSlotChange = (): void => {
    const media = this._getMediaElement();
    this._mediaStore.dispatch({ type: 'mediastateownerchangerequest', detail: media });
  };

  _handleClick = (event: PointerEvent): void => {
    if (!this._mediaStore) return;
    // Ignore clicks from touch/pen devices
    if (navigator.maxTouchPoints > 0 || event.pointerType !== 'mouse') return;
    // Ignore clicks not on media elements
    if (!['video', 'audio'].includes((event.target as HTMLElement).localName || '')) return;

    if (this._paused) {
      this._mediaStore.dispatch({ type: 'playrequest' });
    } else {
      this._mediaStore.dispatch({ type: 'pauserequest' });
    }
  };

  _handlePointerDown = (event: PointerEvent): void => {
    this._pointerDownTimeStamp = event.timeStamp;
  };

  _subscribeToPlayState = (): void => {
    if (!this._mediaStore) return;

    // Subscribe to paused state changes
    this._mediaStore.subscribe((state: any) => {
      this._paused = state.paused ?? true;
      this._updateControlsVisibility();
    });
  };

  _handlePointerMove = (event: PointerEvent): void => {
    if (event.pointerType !== 'mouse') {
      // On mobile we toggle the controls on a tap which is handled in pointerup,
      // but Android fires pointermove events even when the user is just tapping.
      // Prevent calling setActive() on tap because it will mess with the toggle logic.
      const MAX_TAP_DURATION = 250;
      // If the move duration exceeds 250ms then it's a drag and we should show the controls.
      if (event.timeStamp - this._pointerDownTimeStamp < MAX_TAP_DURATION) return;
    }

    this._setUserActive();

    // Stay visible if hovered over control bar
    clearTimeout(this._inactiveTimeout);

    const media = this._getMediaElement();

    // If hovering over something other than controls, we're free to make inactive
    const autohideOverControls = this.hasAttribute(Attributes.AUTOHIDE_OVER_CONTROLS);
    if ([this, media].includes(event.target as HTMLMediaElement) || autohideOverControls) {
      this._scheduleUserInactive();
    }
  };

  _handlePointerUp = (event: PointerEvent): void => {
    if (navigator.maxTouchPoints > 0 || event.pointerType !== 'mouse') {
      const media = this._getMediaElement();

      // Toggle behavior: if user is active, make inactive; otherwise make active
      if (
        [this, media].includes(event.target as HTMLMediaElement)
        && this._isUserActive
      ) {
        this._setUserInactive();
      } else {
        this._scheduleUserInactive();
      }
    } else if (
      event
        .composedPath()
        .some(element =>
          element instanceof HTMLElement && ['media-play-button', 'media-fullscreen-button'].includes(
            element?.localName,
          ),
        )
    ) {
      this._scheduleUserInactive();
    }
  };

  _updateControlsVisibility = (): void => {
    // Match React logic: visible if user active OR paused
    const shouldBeVisible = this._isUserActive || this._paused;
    const targetValue = shouldBeVisible ? 'visible' : 'hidden';

    if (this.getAttribute(Attributes.CONTROLS_VISIBILITY) !== targetValue) {
      this.setAttribute(Attributes.CONTROLS_VISIBILITY, targetValue);
    }
  };

  _setUserActive = (): void => {
    this._isUserActive = true;
    this._updateControlsVisibility();
  };

  _setUserInactive = (): void => {
    if (typeof this._autohide !== 'number' || this._autohide < 0) return;
    this._isUserActive = false;
    this._updateControlsVisibility();
  };

  _scheduleUserInactive = (): void => {
    this._setUserActive();
    clearTimeout(this._inactiveTimeout);
    const autohide = Number.parseInt(this.autohide);

    // Setting autohide to -1 turns off autohide
    if (autohide < 0) return;

    this._inactiveTimeout = setTimeout(() => {
      this._setUserInactive();
    }, autohide);
  };

  set autohide(ms: string) {
    const parsed = Number(ms);
    this._autohide = Number.isNaN(parsed) ? 0 : parsed;
  }

  get autohide(): string {
    return (this._autohide === undefined ? DEFAULT_AUTOHIDE : this._autohide).toString();
  }
}

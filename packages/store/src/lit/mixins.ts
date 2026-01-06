import type { Context, ContextCallback } from '@lit/context';
import type { CustomElement } from '@videojs/utils/dom';
import type { Constructor, Mixin } from '@videojs/utils/types';
import type { AnySlice, UnionSliceTarget } from '../core/slice';
import type { Store } from '../core/store';

import { ContextProvider } from '@lit/context';
import { getSlottedElement, isHTMLMediaElement } from '@videojs/utils/dom';
import { isNull } from '@videojs/utils/predicate';

export interface StoreProvider<Slices extends AnySlice[]> {
  store: Store<UnionSliceTarget<Slices>, Slices>;
}

export interface StoreConnector<Slices extends AnySlice[]> {
  readonly store: Store<UnionSliceTarget<Slices>, Slices> | null;
}

/**
 * Creates a mixin that provides a store via context.
 *
 * - Creates a store instance on first access
 * - Provides the store to descendants via W3C Context Protocol
 * - Allows store replacement via setter (notifies all consumers)
 * - Destroys the store on disconnect (if not externally provided)
 *
 * @example
 * ```ts
 * const { StoreProviderMixin } = createStore({
 *   slices: [playbackSlice]
 * });
 *
 * class MyPlayer extends StoreProviderMixin(HTMLElement) {
 *   connectedCallback() {
 *     super.connectedCallback?.();
 *   }
 * }
 * ```
 */
export function createStoreProviderMixin<Slices extends AnySlice[]>(
  context: Context<unknown, Store<UnionSliceTarget<Slices>, Slices>>,
  factory: () => Store<UnionSliceTarget<Slices>, Slices>,
): Mixin<CustomElement, StoreProvider<Slices>> {
  type StoreType = Store<UnionSliceTarget<Slices>, Slices>;

  return <Base extends Constructor<CustomElement>>(BaseClass: Base) => {
    return class StoreProviderElement extends BaseClass implements StoreProvider<Slices> {
      #store: StoreType | null = null;
      #provider: ContextProvider<typeof context> | null = null;
      #isOwner = false;

      get store(): StoreType {
        if (isNull(this.#store)) {
          this.#store = factory();
          this.#isOwner = true;
        }
        return this.#store;
      }

      set store(newStore: StoreType) {
        const wasOwner = this.#isOwner;
        const oldStore = this.#store;

        this.#store = newStore;
        this.#isOwner = false;

        if (wasOwner && oldStore && oldStore !== newStore) {
          oldStore.destroy();
        }

        this.#provider?.setValue(newStore);
      }

      connectedCallback() {
        super.connectedCallback?.();

        this.#provider = new ContextProvider(this, {
          context,
          initialValue: this.store,
        });
      }

      disconnectedCallback() {
        super.disconnectedCallback?.();

        if (this.#isOwner && this.#store) {
          this.#store.destroy();
          this.#store = null;
          this.#isOwner = false;
        }

        this.#provider = null;
      }
    };
  };
}

/**
 * Creates a mixin that consumes a store from context and auto-attaches media elements.
 *
 * - Requests store from context (must have a provider ancestor)
 * - Observes slotted elements for `<video>` or `<audio>`
 * - Falls back to light DOM children if no shadow root
 * - Calls `store.attach(mediaElement)` when found
 * - Cleans up on disconnect
 *
 * @example
 * ```ts
 * const { StoreAttachMixin } = createStore({ slices: [playbackSlice] });
 *
 * class MyControls extends StoreAttachMixin(HTMLElement) {
 *   connectedCallback() {
 *     super.connectedCallback?.();
 *   }
 * }
 * ```
 */
export function createStoreAttachMixin<Slices extends AnySlice[]>(
  context: Context<unknown, Store<UnionSliceTarget<Slices>, Slices>>,
): Mixin<CustomElement, StoreConnector<Slices>> {
  type StoreType = Store<UnionSliceTarget<Slices>, Slices>;

  return <Base extends Constructor<CustomElement>>(BaseClass: Base) => {
    return class StoreAttachElement extends BaseClass implements StoreConnector<Slices> {
      #store: StoreType | null = null;
      #detach: (() => void) | null = null;
      #contextCallback: ContextCallback<StoreType> | null = null;
      #slotAbort: AbortController | null = null;

      get store(): StoreType | null {
        return this.#store;
      }

      connectedCallback(): void {
        super.connectedCallback?.();

        this.#contextCallback = (value, unsubscribe) => {
          this.#detach?.();
          this.#detach = null;
          this.#store = value;
          this.#attachMedia();
          unsubscribe?.();
        };

        this.dispatchEvent(
          new CustomEvent('context-request', {
            bubbles: true,
            composed: true,
            detail: {
              context,
              callback: this.#contextCallback,
              subscribe: false,
            },
          }),
        );

        this.#observeSlots();
      }

      disconnectedCallback(): void {
        super.disconnectedCallback?.();

        this.#slotAbort?.abort();
        this.#slotAbort = null;

        this.#detach?.();
        this.#detach = null;
        this.#store = null;
        this.#contextCallback = null;
      }

      #observeSlots(): void {
        this.#slotAbort = new AbortController();
        const shadow = this.shadowRoot;

        if (shadow) {
          const slots = shadow.querySelectorAll('slot');
          for (const slot of slots) {
            slot.addEventListener('slotchange', () => this.#attachMedia(), { signal: this.#slotAbort.signal });
          }
        }

        this.#attachMedia();
      }

      #attachMedia(): void {
        const store = this.store;
        if (isNull(store)) return;
        if (this.#detach) return;

        let media: HTMLMediaElement | null = null;
        const shadow = this.shadowRoot;

        if (shadow) {
          media = getSlottedElement(shadow, '', (el) => {
            if (isHTMLMediaElement(el)) return el;
            const nested = el.querySelector('video, audio');
            return isHTMLMediaElement(nested) ? nested : null;
          });
        } else {
          media = this.querySelector('video, audio');
        }

        if (media) {
          this.#detach = store.attach(media as UnionSliceTarget<Slices>);
        }
      }
    };
  };
}

/**
 * Creates a combined mixin that both provides a store and auto-attaches media elements.
 *
 * Composes `StoreProviderMixin` and `StoreAttachMixin` - the provider mixin provides the store
 * via context, and the attach mixin consumes it and auto-attaches media elements.
 *
 * @example
 * ```ts
 * const { StoreMixin } = createStore({ slices: [playbackSlice] });
 *
 * class MyPlayer extends StoreMixin(HTMLElement) {
 *   connectedCallback() {
 *     super.connectedCallback?.();
 *     this.attachShadow({ mode: 'open' });
 *     this.shadowRoot.innerHTML = '<slot></slot>';
 *   }
 * }
 * ```
 */
export function createStoreMixin<Slices extends AnySlice[]>(
  context: Context<unknown, Store<UnionSliceTarget<Slices>, Slices>>,
  factory: () => Store<UnionSliceTarget<Slices>, Slices>,
): Mixin<CustomElement, StoreProvider<Slices> & StoreConnector<Slices>> {
  const ProviderMixin = createStoreProviderMixin<Slices>(context, factory);
  const AttachMixin = createStoreAttachMixin<Slices>(context);

  return <Base extends Constructor<CustomElement>>(BaseClass: Base) => {
    return ProviderMixin(AttachMixin(BaseClass));
  };
}

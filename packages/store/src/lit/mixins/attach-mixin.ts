import type { Context, ContextCallback } from '@lit/context';
import type { CustomElement } from '@videojs/utils/dom';
import type { Constructor, Mixin } from '@videojs/utils/types';
import type { AnySlice, UnionSliceTarget } from '../../core/slice';
import type { Store } from '../../core/store';

import { getSlottedElement, isHTMLMediaElement } from '@videojs/utils/dom';
import { isNull } from '@videojs/utils/predicate';

export interface StoreConnector<Slices extends AnySlice[]> {
  readonly store: Store<UnionSliceTarget<Slices>, Slices> | null;
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

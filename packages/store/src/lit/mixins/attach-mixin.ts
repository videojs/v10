import type { Context } from '@lit/context';
import type { ReactiveElement } from '@lit/reactive-element';
import type { Constructor, Mixin } from '@videojs/utils/types';
import type { AnySlice, UnionSliceTarget } from '../../core/slice';

import type { Store, StoreConsumer } from '../../core/store';
import { ContextConsumer } from '@lit/context';
import { getSlottedElement, isHTMLMediaElement, listen, querySlot } from '@videojs/utils/dom';
import { Disposer } from '@videojs/utils/events';
import { noop } from '@videojs/utils/function';
import { isNull } from '@videojs/utils/predicate';

/**
 * Creates a mixin that consumes a store from context and auto-attaches media elements.
 *
 * - Requests store from context (must have a provider ancestor)
 * - Observes slotted elements for `<video slot="media">` or `<audio slot="media">`
 * - Falls back to light DOM children if no shadow root
 * - Calls `store.attach(mediaElement)` when found
 * - Cleans up on disconnect
 *
 * @example
 * ```ts
 * const { StoreAttachMixin } = createStore({ slices: [playbackSlice] });
 *
 * class MyControls extends StoreAttachMixin(LitElement) {}
 * ```
 */
export function createStoreAttachMixin<Slices extends AnySlice[]>(
  context: Context<unknown, Store<UnionSliceTarget<Slices>, Slices>>,
): Mixin<ReactiveElement, StoreConsumer<Slices>> {
  type ConsumedStore = Store<UnionSliceTarget<Slices>, Slices>;

  return <Base extends Constructor<ReactiveElement>>(BaseClass: Base) => {
    class StoreAttachElement extends BaseClass implements StoreConsumer<Slices> {
      #disposer = new Disposer();
      #detach = noop;

      #consumer = new ContextConsumer(this, {
        context,
        callback: () => this.#attachMedia(),
        subscribe: false,
      });

      get store(): ConsumedStore | null {
        return this.#consumer.value ?? null;
      }

      override connectedCallback() {
        super.connectedCallback();

        const shadow = this.shadowRoot;
        if (shadow) {
          const slot = querySlot(shadow, 'media');
          if (slot) this.#disposer.add(listen(slot, 'slotchange', () => this.#attachMedia()));
        }

        this.#attachMedia();
      }

      override disconnectedCallback() {
        super.disconnectedCallback();
        this.#disposer.dispose();
        this.#detach();
      }

      #attachMedia() {
        const store = this.store;

        if (isNull(store)) return;

        const media = this.shadowRoot
          ? getSlottedElement(this.shadowRoot, 'media', el => isHTMLMediaElement(el) && el)
          : this.querySelector('video, audio');

        if (store.target !== media) {
          this.#detach();
          this.#detach = store.attach(media as UnionSliceTarget<Slices>);
        }
      }
    }

    return StoreAttachElement;
  };
}

import type { Context } from '@lit/context';
import { ContextConsumer } from '@lit/context';
import type { ReactiveElement } from '@lit/reactive-element';
import { getSlottedElement, isHTMLMediaElement, listen, querySlot } from '@videojs/utils/dom';
import { Disposer } from '@videojs/utils/events';
import { noop } from '@videojs/utils/function';
import { isNull } from '@videojs/utils/predicate';
import type { Constructor, Mixin } from '@videojs/utils/types';
import type { AnyStore, InferStoreTarget } from '../../core/store';
import type { StoreConsumer } from '../types';

/**
 * Creates a mixin that consumes a store from context and auto-attaches media elements.
 *
 * @example
 * ```ts
 * const { ContainerMixin } = createStore({ features: [playbackFeature] });
 *
 * class MyControls extends ContainerMixin(LitElement) {}
 * ```
 */
export function createContainerMixin<Store extends AnyStore>(
  context: Context<unknown, Store>
): Mixin<ReactiveElement, StoreConsumer<Store>> {
  return <Base extends Constructor<ReactiveElement>>(BaseClass: Base) => {
    class StoreAttachElement extends BaseClass implements StoreConsumer<Store> {
      #disposer = new Disposer();
      #detach = noop;

      #consumer = new ContextConsumer(this, {
        context,
        callback: () => this.#attachMedia(),
        subscribe: false,
      });

      get store(): Store | null {
        return this.#consumer.value ?? null;
      }

      override connectedCallback() {
        super.connectedCallback();

        const shadow = this.shadowRoot;
        if (shadow) {
          const slot = querySlot(shadow, '');
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

        const findMedia = (el: Element): HTMLMediaElement | null =>
          isHTMLMediaElement(el) ? el : el.querySelector('video, audio');

        const media = this.shadowRoot
          ? getSlottedElement(this.shadowRoot, '', findMedia)
          : this.querySelector('video, audio');

        if (store.target !== media) {
          this.#detach();
          this.#detach = store.attach(media as InferStoreTarget<Store>);
        }
      }
    }

    return StoreAttachElement;
  };
}

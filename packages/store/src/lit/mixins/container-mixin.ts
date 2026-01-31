import type { Context } from '@lit/context';
import { ContextConsumer } from '@lit/context';
import type { ReactiveElement } from '@lit/reactive-element';
import { getSlottedElement, isHTMLMediaElement, listen, querySlot } from '@videojs/utils/dom';
import { Disposer } from '@videojs/utils/events';
import { noop } from '@videojs/utils/function';
import { isNull } from '@videojs/utils/predicate';
import type { Constructor, Mixin } from '@videojs/utils/types';
import type { AnyFeature, UnionFeatureTarget } from '../../core/feature';
import type { Store, StoreConsumer } from '../../core/store';

/**
 * Creates a mixin that consumes a store from context and auto-attaches media elements.
 *
 * - Requests store from context (must have a provider ancestor)
 * - Observes slotted elements for `<video>` or `<audio>` in the default slot
 * - Falls back to light DOM children if no shadow root
 * - Calls `store.attach(mediaElement)` when found
 * - Cleans up on disconnect
 *
 * @example
 * ```ts
 * const { ContainerMixin } = createStore({ features: [playbackFeature] });
 *
 * class MyControls extends ContainerMixin(LitElement) {}
 * ```
 */
export function createContainerMixin<Features extends AnyFeature[]>(
  context: Context<unknown, Store<UnionFeatureTarget<Features>, Features>>
): Mixin<ReactiveElement, StoreConsumer<Features>> {
  type ConsumedStore = Store<UnionFeatureTarget<Features>, Features>;

  return <Base extends Constructor<ReactiveElement>>(BaseClass: Base) => {
    class StoreAttachElement extends BaseClass implements StoreConsumer<Features> {
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

        // Check if element is media, or search inside for nested media
        const findMedia = (el: Element): HTMLMediaElement | null =>
          isHTMLMediaElement(el) ? el : el.querySelector('video, audio');

        const media = this.shadowRoot
          ? getSlottedElement(this.shadowRoot, '', findMedia)
          : this.querySelector('video, audio');

        if (store.target !== media) {
          this.#detach();
          this.#detach = store.attach(media as UnionFeatureTarget<Features>);
        }
      }
    }

    return StoreAttachElement;
  };
}

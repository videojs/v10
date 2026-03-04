import type { MediaContainer, PlayerStore, PlayerTarget } from '@videojs/core/dom';
import { ContextConsumer } from '@videojs/element/context';
import { noop } from '@videojs/utils/function';
import type { MediaElementConstructor } from '@/ui/media-element';
import type { PlayerContext } from '../player/context';
import type { PlayerConsumer, PlayerConsumerConstructor } from './types';

export type ContainerMixin<Store extends PlayerStore> = <Class extends MediaElementConstructor>(
  BaseClass: Class
) => Class & PlayerConsumerConstructor<Store>;

/**
 * Create a mixin that consumes player context and auto-attaches media elements.
 *
 * @param context - Player context to consume from an ancestor provider.
 */
export function createContainerMixin<Store extends PlayerStore>(context: PlayerContext<Store>): ContainerMixin<Store> {
  return <Class extends MediaElementConstructor>(BaseClass: Class) => {
    class PlayerContainerElement extends BaseClass implements PlayerConsumer<Store>, MediaContainer {
      #detach = noop;
      #observer: MutationObserver | null = null;
      #contextStore: Store | null = null;

      constructor(...args: any[]) {
        super(...args);

        // Created in the constructor body (after all field initializers) so
        // that #contextStore's private slot exists if the callback fires
        // synchronously — which happens when the element is already connected.
        // The host's controller list keeps the consumer alive; no field needed.
        new ContextConsumer(this, {
          context,
          callback: (value) => {
            this.#contextStore = value ?? null;
            this.#attachMedia();
          },
          subscribe: true,
        });
      }

      get store(): Store | null {
        return this.#contextStore;
      }

      override connectedCallback() {
        super.connectedCallback();

        this.#observer = new MutationObserver((records) => {
          if (records.some(hasMediaNode)) this.#attachMedia();
        });

        this.#observer.observe(this, { childList: true, subtree: true });

        // Slotted media elements don't appear in the container's subtree,
        // so listen for slot reassignments to pick them up.
        this.addEventListener('slotchange', this.#onSlotChange);

        this.#attachMedia();
      }

      override disconnectedCallback() {
        super.disconnectedCallback();
        this.#observer?.disconnect();
        this.#observer = null;
        this.removeEventListener('slotchange', this.#onSlotChange);
        this.#detach();
      }

      #onSlotChange = () => {
        this.#attachMedia();
      };

      #getSlottedMedia(): HTMLMediaElement | null {
        const slot = this.querySelector<HTMLSlotElement>('slot[name="media"]');
        if (!slot) return null;

        for (const el of slot.assignedElements({ flatten: true })) {
          if (el instanceof HTMLMediaElement) return el;
        }

        return null;
      }

      #attachMedia() {
        // Prefer the cached context value; fall back to `this.store` which
        // ProviderMixin overrides when both mixins are applied to one element.
        const store = this.#contextStore ?? this.store;
        if (!store) return;

        const media = this.querySelector<HTMLMediaElement>('video, audio') ?? this.#getSlottedMedia();

        if (!media) {
          this.#detach();
          this.#detach = noop;
          return;
        }

        const target: PlayerTarget = {
          media,
          container: this,
        };

        const hasMediaChanged = store.target?.media !== target.media,
          hasContainerChanged = store.target?.container !== target.container;

        if (hasMediaChanged || hasContainerChanged) {
          this.#detach();
          this.#detach = store.attach(target);
        }
      }
    }

    return PlayerContainerElement;
  };
}

function isMediaNode(node: Node): boolean {
  return node instanceof HTMLMediaElement;
}

function hasMediaNode(record: MutationRecord): boolean {
  for (const node of record.addedNodes) {
    if (isMediaNode(node)) return true;
  }

  for (const node of record.removedNodes) {
    if (isMediaNode(node)) return true;
  }

  return false;
}

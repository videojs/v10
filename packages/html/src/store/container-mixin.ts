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
          if (records.some(hasMediaElement)) this.#attachMedia();
        });

        this.#observer.observe(this, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['name'],
        });

        // Slotted media elements don't appear in the container's subtree,
        // so listen for slot reassignments to pick them up.
        this.addEventListener('slotchange', this.#onSlotChange);
      }

      override disconnectedCallback() {
        super.disconnectedCallback();
        this.removeEventListener('slotchange', this.#onSlotChange);
        this.#detach();
      }

      #onSlotChange = () => {
        this.#attachMedia();
      };

      #getSlottedMedia(): HTMLMediaElement | null {
        const media = this.querySelector(':scope > [slot=media]');

        for (const el of slot.assignedElements({ flatten: true })) {
          if (isMediaElement(el)) return el as HTMLMediaElement;
        }

        return media as HTMLMediaElement | null;
      }

      #findMediaElement(): HTMLMediaElement | null {
        const media = Array.from(this.children).find(isMediaElement);
        if (media) return media as HTMLMediaElement;
        return null;
      }

      #attachMedia() {
        // Prefer the cached context value; fall back to `this.store` which
        // ProviderMixin overrides when both mixins are applied to one element.
        const store = this.#contextStore ?? this.store;
        if (!store) return;

        const media =
          this.querySelector<HTMLMediaElement>('video, audio') ?? this.#findMediaElement() ?? this.#getSlottedMedia();

        if (!media) {
          this.#detach();
          this.#detach = noop;
          return;
        }

        if (isCustomMediaElement(media)) {
          globalThis.customElements?.upgrade?.(media);
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

function isMediaElement(node: Node): boolean {
  return node instanceof HTMLMediaElement || isCustomMediaElement(node);
}

function isCustomMediaElement(node: Node): boolean {
  return node instanceof HTMLElement && (node.localName.endsWith('-audio') || node.localName.endsWith('-video'));
}

function isMediaSlotElement(node: Node): boolean {
  return node instanceof HTMLSlotElement && node.name === 'media';
}

function hasMediaElement(record: MutationRecord): boolean {
  if (isMediaSlotElement(record.target)) return true;

  for (const node of record.addedNodes) {
    if (isMediaElement(node) || isMediaSlotElement(node)) return true;
  }

  for (const node of record.removedNodes) {
    if (isMediaElement(node) || isMediaSlotElement(node)) return true;
  }

  return false;
}

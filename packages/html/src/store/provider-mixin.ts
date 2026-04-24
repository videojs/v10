import type { Media, MediaContainer, PlayerStore, PlayerTarget, Video } from '@videojs/core/dom';
import { toMediaHost } from '@videojs/core/dom/media/host';
import { ContextProvider } from '@videojs/element/context';
import { isNull } from '@videojs/utils/predicate';
import type { MediaElementConstructor } from '@/ui/media-element';
import type { ContainerContext, MediaContext, PlayerContext } from '../player/context';
import type { PlayerProvider, PlayerProviderConstructor } from './types';

export interface ProviderMixinConfig<Store extends PlayerStore> {
  playerContext: PlayerContext<Store>;
  mediaContext: MediaContext;
  containerContext: ContainerContext;
  factory: () => Store;
}

export type ProviderMixin<Store extends PlayerStore> = <Class extends MediaElementConstructor>(
  BaseClass: Class
) => Class & PlayerProviderConstructor<Store>;

/**
 * Create a mixin that provides player context to descendant elements and
 * owns the `store.attach()` lifecycle.
 *
 * Media and container elements register themselves via media/container
 * contexts that carry both the current value and a setter. When a media
 * element is available, the provider calls `store.attach({ media, container })`.
 *
 * As a fallback for plain `<video>`/`<audio>` that can't consume context,
 * the provider queries its subtree after a microtask.
 *
 * @param config - Provider configuration with contexts and store factory.
 */
export function createProviderMixin<Store extends PlayerStore>(
  config: ProviderMixinConfig<Store>
): ProviderMixin<Store> {
  return <Class extends MediaElementConstructor>(BaseClass: Class) => {
    class PlayerProviderElement extends BaseClass implements PlayerProvider<Store> {
      #store: Store | null = config.factory();
      #detach: (() => void) | null = null;
      #releaseMedia: (() => void) | null = null;
      #wrappedMedia: Video | null = null;
      #media: Media | null = null;
      #container: MediaContainer | null = null;
      #fallbackQueued = false;

      #setMedia = (media: Media | null): void => {
        if (this.#media === media) return;
        this.#media = media;
        // Drop any previous auto-host so the next #tryAttach re-wraps.
        this.#releaseAutoHost();
        this.#mediaProvider.setValue({ media, setMedia: this.#setMedia });
        this.#tryAttach();
      };

      #setContainer = (container: MediaContainer | null): void => {
        if (this.#container === container) return;
        this.#container = container;
        this.#containerProvider.setValue({ container, setContainer: this.#setContainer });
        this.#tryAttach();
      };

      #playerProvider = new ContextProvider(this, {
        context: config.playerContext,
        initialValue: this.store,
      });

      #mediaProvider = new ContextProvider(this, {
        context: config.mediaContext,
        initialValue: { media: this.#media, setMedia: this.#setMedia },
      });

      #containerProvider = new ContextProvider(this, {
        context: config.containerContext,
        initialValue: { container: this.#container, setContainer: this.#setContainer },
      });

      get store(): Store {
        if (isNull(this.#store)) {
          this.#store = config.factory();
        }

        return this.#store;
      }

      override connectedCallback() {
        super.connectedCallback();
        this.#playerProvider.setValue(this.store);
        this.#mediaProvider.setValue({ media: this.#media, setMedia: this.#setMedia });
        this.#containerProvider.setValue({ container: this.#container, setContainer: this.#setContainer });
        this.#tryAttach();
        this.#queueFallbackDiscovery();
      }

      override disconnectedCallback() {
        super.disconnectedCallback();
        this.#detachStore();
      }

      override destroyCallback() {
        this.#detachStore();
        this.#store?.destroy();
        this.#store = null;
        super.destroyCallback();
      }

      #tryAttach(): void {
        const store = this.#store;
        if (!store) return;

        if (!this.#media) {
          this.#detachStore();
          return;
        }

        // Wrap raw <video>/<audio> elements so features see the full host API.
        // The wrapper is reused until #media changes (see #setMedia).
        if (!this.#wrappedMedia) {
          const { media, release } = toMediaHost(this.#media);
          this.#wrappedMedia = media;
          this.#releaseMedia = release;
        }

        const target: PlayerTarget = {
          media: this.#wrappedMedia,
          container: this.#container,
        };

        const hasMediaChanged = store.target?.media !== target.media;
        const hasContainerChanged = store.target?.container !== target.container;

        if (hasMediaChanged || hasContainerChanged) {
          this.#detach?.();
          this.#detach = store.attach(target);
        }
      }

      #detachStore(): void {
        this.#detach?.();
        this.#detach = null;
        this.#releaseAutoHost();
      }

      #releaseAutoHost(): void {
        this.#releaseMedia?.();
        this.#releaseMedia = null;
        this.#wrappedMedia = null;
      }

      #queueFallbackDiscovery(): void {
        if (this.#media || this.#fallbackQueued) return;
        this.#fallbackQueued = true;

        queueMicrotask(() => {
          this.#fallbackQueued = false;

          // Context already registered media — skip fallback.
          if (this.#media) return;

          const media = this.querySelector<HTMLMediaElement>('video, audio');
          if (media) {
            this.#setMedia(media);
          }
        });
      }
    }

    return PlayerProviderElement;
  };
}

import {
  createPopupGroup,
  type MediaContainer,
  type PlayerFeatureConfig,
  type PlayerStore,
  type PlayerTarget,
  setPlayerConfigValue,
} from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';
import { ContextProvider } from '@videojs/element/context';
import type { Media } from '@videojs/media/dom';
import { isNull } from '@videojs/utils/predicate';
import { kebabCase } from '@videojs/utils/string';
import type { MediaElementConstructor } from '@/ui/media-element';
import type { ContainerContext, MediaContext, PlayerContext } from '../player/context';
import type { PlayerProviderConstructor } from './types';

export interface ProviderMixinConfig<Store extends PlayerStore> {
  playerContext: PlayerContext<Store>;
  mediaContext: MediaContext;
  containerContext: ContainerContext;
  factory: () => Store;
  config: PlayerFeatureConfig;
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
 * @param options - Provider options with contexts, store factory, and feature configuration.
 */
export function createProviderMixin<Store extends PlayerStore>(
  options: ProviderMixinConfig<Store>
): ProviderMixin<Store> {
  const configKeys = Object.keys(options.config);

  return <Class extends MediaElementConstructor>(BaseClass: Class) => {
    class PlayerProviderElement extends BaseClass {
      static properties = {
        ...(BaseClass as unknown as { properties: PropertyDeclarationMap }).properties,
        ...Object.fromEntries(configKeys.map((key) => [key, { type: String, attribute: kebabCase(key) }])),
      };

      #store: Store | null = options.factory();
      #configuredStore: Store | null = null;
      #detach: (() => void) | null = null;
      #media: Media | null = null;
      #container: MediaContainer | null = null;
      #popupGroup = createPopupGroup();
      #fallbackQueued = false;

      #setMedia = (media: Media | null): void => {
        if (this.#media === media) return;
        this.#media = media;
        this.#mediaProvider.setValue({ media, setMedia: this.#setMedia });
        this.#tryAttach();
      };

      #setContainer = (container: MediaContainer | null): void => {
        if (this.#container === container) return;
        this.#container = container;
        this.#containerProvider.setValue({
          container,
          setContainer: this.#setContainer,
          popupGroup: this.#popupGroup,
        });
        this.#tryAttach();
      };

      #playerProvider = new ContextProvider(this, {
        context: options.playerContext,
        initialValue: this.store,
      });

      #mediaProvider = new ContextProvider(this, {
        context: options.mediaContext,
        initialValue: { media: this.#media, setMedia: this.#setMedia },
      });

      #containerProvider = new ContextProvider(this, {
        context: options.containerContext,
        initialValue: {
          container: this.#container,
          setContainer: this.#setContainer,
          popupGroup: this.#popupGroup,
        },
      });

      get store(): Store {
        if (isNull(this.#store)) {
          this.#store = options.factory();
        }

        return this.#store;
      }

      override connectedCallback() {
        this.#syncInitialConfig();
        super.connectedCallback();
        this.#playerProvider.setValue(this.store);
        this.#mediaProvider.setValue({ media: this.#media, setMedia: this.#setMedia });
        this.#containerProvider.setValue({
          container: this.#container,
          setContainer: this.#setContainer,
          popupGroup: this.#popupGroup,
        });
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

      protected override willUpdate(changed: PropertyValues): void {
        super.willUpdate(changed);

        // Configuration flows one way: only actual reactive property changes
        // write to the store. Store-side writers do not reflect back here.
        for (const key of configKeys) {
          if (!changed.has(key)) continue;
          setPlayerConfigValue(this.store, options.config[key]!, (this as unknown as Record<string, unknown>)[key]);
        }
      }

      #tryAttach(): void {
        const store = this.#store;
        if (!store) return;

        if (!this.#media) {
          this.#detachStore();
          return;
        }

        const target: PlayerTarget = {
          media: this.#media,
          container: this.#container,
        };

        const hasMediaChanged = store.target?.media !== target.media;
        const hasContainerChanged = store.target?.container !== target.container;

        if (hasMediaChanged || hasContainerChanged) {
          this.#detachStore();
          this.#detach = store.attach(target);
        }
      }

      #detachStore(): void {
        this.#detach?.();
        this.#detach = null;
      }

      #syncInitialConfig(): void {
        const store = this.store;
        if (this.#configuredStore === store) return;

        for (const key of configKeys) {
          setPlayerConfigValue(store, options.config[key]!, (this as unknown as Record<string, unknown>)[key]);
        }
        this.#configuredStore = store;
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

    return PlayerProviderElement as unknown as Class & PlayerProviderConstructor<Store>;
  };
}

import {
  createPopupGroup,
  type Media,
  type MediaContainer,
  type PlayerStore,
  type PlayerTarget,
} from '@videojs/core/dom';
import { isMediaControlsCapable } from '@videojs/core/media/predicate';
import { ContextProvider } from '@videojs/element/context';
import { isNull } from '@videojs/utils/predicate';
import type { MediaElementConstructor } from '@/ui/media-element';
import type { ContainerContext, ControlsContext, MediaContext, PlayerContext } from '../player/context';
import type { PlayerProvider, PlayerProviderConstructor } from './types';

export interface ProviderMixinConfig<Store extends PlayerStore> {
  playerContext: PlayerContext<Store>;
  mediaContext: MediaContext;
  controlsContext: ControlsContext;
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
      #media: Media | null = null;
      #container: MediaContainer | null = null;
      #popupGroup = createPopupGroup();
      #controlsCount = 0;
      #nativeControlsHidden = false;
      #fallbackQueued = false;

      #setMedia = (media: Media | null): void => {
        if (this.#media === media) return;
        this.#restoreNativeControls();
        this.#media = media;
        this.#mediaProvider.setValue({ media, setMedia: this.#setMedia });
        this.#tryAttach();
      };

      #registerControls = (): (() => void) => {
        this.#controlsCount += 1;
        this.#syncControlsContext();
        this.#hideNativeControls();

        return () => {
          this.#controlsCount = Math.max(0, this.#controlsCount - 1);
          if (!this.#controlsCount) {
            this.#restoreNativeControls();
          }
          this.#syncControlsContext();
        };
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
        context: config.playerContext,
        initialValue: this.store,
      });

      #mediaProvider = new ContextProvider(this, {
        context: config.mediaContext,
        initialValue: { media: this.#media, setMedia: this.#setMedia },
      });

      #controlsProvider = new ContextProvider(this, {
        context: config.controlsContext,
        initialValue: { mounted: false, register: this.#registerControls },
      });

      #containerProvider = new ContextProvider(this, {
        context: config.containerContext,
        initialValue: {
          container: this.#container,
          setContainer: this.#setContainer,
          popupGroup: this.#popupGroup,
        },
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
        this.#syncControlsContext();
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
          this.#hideNativeControls();
        }
      }

      #hideNativeControls(): void {
        if (!this.#controlsCount || !isMediaControlsCapable(this.#media) || !this.#media.controls) return;
        this.#media.controls = false;
        this.#nativeControlsHidden = true;
      }

      #restoreNativeControls(): void {
        if (!this.#nativeControlsHidden) return;
        if (isMediaControlsCapable(this.#media)) {
          this.#media.controls = true;
        }
        this.#nativeControlsHidden = false;
      }

      #syncControlsContext(): void {
        this.#controlsProvider.setValue({
          mounted: this.#controlsCount > 0,
          register: this.#registerControls,
        });
      }

      #detachStore(): void {
        this.#detach?.();
        this.#detach = null;
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

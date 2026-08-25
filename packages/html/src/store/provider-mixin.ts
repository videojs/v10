import {
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
import { camelCase, kebabCase } from '@videojs/utils/string';

import type { UIElementConstructor } from '@/ui/ui-element';

import type { ContainerContext, MediaContext, PlayerContext } from '../player/context';
import type { PlayerProviderConstructor } from './types';

export interface ProviderMixinConfig<Store extends PlayerStore> {
  playerContext: PlayerContext<Store>;
  mediaContext: MediaContext;
  containerContext: ContainerContext;
  factory: () => Store;
  config: PlayerFeatureConfig;
}

export type ProviderMixin<Store extends PlayerStore> = <Class extends UIElementConstructor>(
  BaseClass: Class
) => Class & PlayerProviderConstructor<Store>;

interface Registration<Value> {
  value: Value;
}

/** One configuration input, under the names it goes by on the element. */
interface ConfigInput {
  /** Reactive property mirroring the attribute. */
  property: string;
  attribute: string;
  entry: PlayerFeatureConfig[string];
}

/**
 * Name each input on the element. A key whose own name is taken there declares an `html.attribute` instead, and the
 * property follows from that.
 */
function resolveInputs(config: PlayerFeatureConfig): ConfigInput[] {
  return Object.entries(config).map(([key, entry]) => {
    const declared = entry.html?.attribute;
    const attribute = declared ?? kebabCase(key);

    if (__DEV__ && declared && declared !== kebabCase(declared)) {
      // Markup lowercases attribute names, so an uppercase letter here never matches.
      console.warn(`[vjs-html] config html.attribute "${declared}" is not kebab-case and will never match`);
    }

    return { property: camelCase(attribute), attribute, entry };
  });
}

/**
 * Create a mixin that provides player context to descendant elements and owns the `store.attach()` lifecycle.
 *
 * Media and container elements register themselves via media/container contexts. When a media element is available, the
 * provider calls `store.attach({ media, container })`.
 *
 * Plain `<video>`/`<audio>` elements that cannot consume context are tracked through the provider subtree.
 *
 * @param options - Provider options with contexts, store factory, and feature configuration.
 */
export function createProviderMixin<Store extends PlayerStore>(
  options: ProviderMixinConfig<Store>
): ProviderMixin<Store> {
  const inputs = resolveInputs(options.config);

  return <Class extends UIElementConstructor>(BaseClass: Class) => {
    class PlayerProviderElement extends BaseClass {
      static properties = {
        ...(BaseClass as unknown as { properties: PropertyDeclarationMap }).properties,
        ...Object.fromEntries(inputs.map(({ property, attribute }) => [property, { type: String, attribute }])),
      };

      #store: Store | null = options.factory();
      #configuredStore: Store | null = null;
      #detach: (() => void) | null = null;
      #connected = false;
      #media: Media | null = null;
      #nativeMedia: HTMLMediaElement | null = null;
      #container: MediaContainer | null = null;
      #mediaRegistrations: Registration<Media>[] = [];
      #containerRegistrations: Registration<MediaContainer>[] = [];
      #observer = new MutationObserver(() => this.#syncNativeMedia());

      #registerMedia = (media: Media): (() => void) => {
        const registration = { value: media };

        this.#mediaRegistrations.push(registration);
        this.#syncMedia();

        return () => {
          const index = this.#mediaRegistrations.indexOf(registration);
          if (index < 0) return;

          this.#mediaRegistrations.splice(index, 1);
          this.#syncNativeMedia();
          this.#syncMedia();
        };
      };

      #registerContainer = (container: MediaContainer): (() => void) => {
        const registration = { value: container };

        this.#containerRegistrations.push(registration);
        this.#syncContainer();

        return () => {
          const index = this.#containerRegistrations.indexOf(registration);
          if (index < 0) return;

          this.#containerRegistrations.splice(index, 1);
          this.#syncContainer();
        };
      };

      #playerProvider = new ContextProvider(this, {
        context: options.playerContext,
        initialValue: this.store,
      });

      #mediaProvider = new ContextProvider(this, {
        context: options.mediaContext,
        initialValue: { media: this.#media, registerMedia: this.#registerMedia },
      });

      #containerProvider = new ContextProvider(this, {
        context: options.containerContext,
        initialValue: {
          container: this.#container,
          registerContainer: this.#registerContainer,
        },
      });

      get store(): Store {
        if (isNull(this.#store)) {
          this.#store = options.factory();
        }

        return this.#store;
      }

      override connectedCallback() {
        this.#connected = true;
        this.#syncInitialConfig();
        super.connectedCallback();
        this.#playerProvider.setValue(this.store);
        this.#publishMedia();
        this.#publishContainer();
        this.#observer.observe(this, { childList: true, subtree: true });
        queueMicrotask(() => {
          if (this.#connected) this.#syncNativeMedia();
        });
        this.#tryAttach();
      }

      override disconnectedCallback() {
        this.#connected = false;
        this.#observer.disconnect();
        this.#detachStore();
        super.disconnectedCallback();
      }

      override destroyCallback() {
        this.#observer.disconnect();
        this.#detachStore();
        this.#store?.destroy();
        this.#store = null;
        super.destroyCallback();
      }

      protected override willUpdate(changed: PropertyValues): void {
        super.willUpdate(changed);

        // Configuration flows one way: only actual reactive property changes
        // write to the store. Store-side writers do not reflect back here.
        for (const { property, entry } of inputs) {
          if (!changed.has(property)) continue;

          setPlayerConfigValue(this.store, entry, (this as unknown as Record<string, unknown>)[property]);
        }
      }

      #syncMedia(): void {
        const registered = this.#mediaRegistrations.at(-1)?.value ?? null;
        const media = registered ?? this.#nativeMedia;
        if (this.#media === media) return;

        this.#media = media;
        this.#publishMedia();
        this.#tryAttach();
      }

      #syncContainer(): void {
        const container = this.#containerRegistrations.at(-1)?.value ?? null;
        if (this.#container === container) return;

        this.#container = container;
        this.#publishContainer();
        this.#tryAttach();
      }

      #syncNativeMedia(): void {
        const media = this.querySelector<HTMLMediaElement>('video, audio');
        if (this.#nativeMedia === media) return;

        this.#nativeMedia = media;
        this.#syncMedia();
      }

      #publishMedia(): void {
        this.#mediaProvider.setValue({ media: this.#media, registerMedia: this.#registerMedia });
      }

      #publishContainer(): void {
        this.#containerProvider.setValue({
          container: this.#container,
          registerContainer: this.#registerContainer,
        });
      }

      #tryAttach(): void {
        const store = this.#store;
        if (!this.#connected || !store) return;

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

        for (const { property, entry } of inputs) {
          setPlayerConfigValue(store, entry, (this as unknown as Record<string, unknown>)[property]);
        }

        this.#configuredStore = store;
      }
    }

    return PlayerProviderElement as unknown as Class & PlayerProviderConstructor<Store>;
  };
}

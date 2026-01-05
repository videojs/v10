import type { Context, ContextCallback } from '@lit/context';
import type { AnySlice, UnionSliceTarget } from '../core/slice';
import type { Store } from '../core/store';

import { ContextProvider } from '@lit/context';
import { isNull } from '@videojs/utils/predicate';

// ----------------------------------------
// Types
// ----------------------------------------

/**
 * Constructor type for mixins.
 */
export type Constructor<T = object> = new (...args: any[]) => T;

/**
 * Mixin function type.
 */
export type Mixin<T extends HTMLElement = HTMLElement> = <Base extends Constructor<T>>(Base: Base) => Base;

/**
 * Interface for elements that provide a store.
 */
export interface StoreProvider<Slices extends AnySlice[]> {
  /**
   * The store instance. Setting this replaces the store and notifies all consumers.
   */
  store: Store<UnionSliceTarget<Slices>, Slices>;
}

/**
 * Interface for elements that consume a store and attach media elements.
 */
export interface StoreAttacher<Slices extends AnySlice[]> {
  /**
   * The store instance from context.
   */
  readonly store: Store<UnionSliceTarget<Slices>, Slices> | null;
}

// ----------------------------------------
// StoreProviderMixin
// ----------------------------------------

/**
 * Creates a mixin that provides a store via context.
 *
 * The mixin:
 * - Creates a store instance on first access
 * - Provides the store to descendants via W3C Context Protocol
 * - Allows store replacement via setter (notifies all consumers)
 * - Destroys the store on disconnect (if not externally provided)
 *
 * @param context - The context to provide the store through
 * @param createStoreFn - Factory function to create the store instance
 *
 * @example
 * ```ts
 * const { context } = createStore({ slices: [playbackSlice] });
 *
 * class MyPlayer extends StoreProviderMixin(HTMLElement) {
 *   connectedCallback() {
 *     super.connectedCallback?.();
 *     // Store is now available via context
 *   }
 * }
 * ```
 */
export function createStoreProviderMixin<Slices extends AnySlice[]>(
  context: Context<unknown, Store<UnionSliceTarget<Slices>, Slices>>,
  createStoreFn: () => Store<UnionSliceTarget<Slices>, Slices>,
): Mixin {
  type StoreType = Store<UnionSliceTarget<Slices>, Slices>;

  return <TBase extends Constructor<HTMLElement>>(Base: TBase): TBase => {
    return class StoreProviderElement extends Base implements StoreProvider<Slices> {
      #store: StoreType | null = null;
      #provider: ContextProvider<typeof context> | null = null;
      #isOwner = false;

      /**
       * Get the store instance, creating it if necessary.
       */
      get store(): StoreType {
        if (isNull(this.#store)) {
          this.#store = createStoreFn();
          this.#isOwner = true;
        }

        return this.#store;
      }

      /**
       * Set the store instance. Notifies all context consumers.
       */
      set store(newStore: StoreType) {
        const wasOwner = this.#isOwner;
        const oldStore = this.#store;

        this.#store = newStore;
        this.#isOwner = false;

        // Clean up old store if we owned it
        if (wasOwner && oldStore && oldStore !== newStore) {
          oldStore.destroy();
        }

        // Update provider if connected
        this.#provider?.setValue(newStore);
      }

      connectedCallback(): void {
        // @ts-expect-error - Base class may have connectedCallback
        super.connectedCallback?.();

        // Create provider with current store
        this.#provider = new ContextProvider(this, {
          context,
          initialValue: this.store,
        });
      }

      disconnectedCallback(): void {
        // @ts-expect-error - Base class may have disconnectedCallback
        super.disconnectedCallback?.();

        // Destroy store if we created it
        if (this.#isOwner && this.#store) {
          this.#store.destroy();
          this.#store = null;
          this.#isOwner = false;
        }

        this.#provider = null;
      }
    } as TBase;
  };
}

// ----------------------------------------
// StoreAttachMixin
// ----------------------------------------

/**
 * Creates a mixin that consumes a store from context and auto-attaches media elements.
 *
 * The mixin:
 * - Requests store from context (must have a provider ancestor)
 * - Observes slotted elements for `<video>` or `<audio>`
 * - Falls back to light DOM children if no shadow root
 * - Calls `store.attach(mediaElement)` when found
 * - Cleans up on disconnect
 *
 * @param context - The context to consume the store from
 *
 * @example
 * ```ts
 * const { context } = createStore({ slices: [playbackSlice] });
 *
 * class MyControls extends StoreAttachMixin(HTMLElement) {
 *   connectedCallback() {
 *     super.connectedCallback?.();
 *     // Will attach any <video> or <audio> in slots/children
 *   }
 * }
 * ```
 */
export function createStoreAttachMixin<Slices extends AnySlice[]>(
  context: Context<unknown, Store<UnionSliceTarget<Slices>, Slices>>,
): Mixin {
  type StoreType = Store<UnionSliceTarget<Slices>, Slices>;

  return <TBase extends Constructor<HTMLElement>>(Base: TBase): TBase => {
    return class StoreAttachElement extends Base implements StoreAttacher<Slices> {
      #store: StoreType | null = null;
      #detach: (() => void) | null = null;
      #contextCallback: ContextCallback<StoreType> | null = null;
      #slotAbort: AbortController | null = null;

      /**
       * Get the store instance from context.
       */
      get store(): StoreType | null {
        return this.#store;
      }

      connectedCallback(): void {
        // @ts-expect-error - Base class may have connectedCallback
        super.connectedCallback?.();

        // Request store from context
        this.#contextCallback = (value, unsubscribe) => {
          // Clean up previous attachment
          this.#detach?.();
          this.#detach = null;

          this.#store = value;

          // Try to attach media element
          this.#attachMedia();

          // We only need the initial value, unsubscribe from future updates
          // (store changes are handled via the setter in provider)
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

        // Set up slot change listener
        this.#observeSlots();
      }

      disconnectedCallback(): void {
        // @ts-expect-error - Base class may have disconnectedCallback
        super.disconnectedCallback?.();

        // Clean up slot listeners
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
          // Observe slot changes in shadow DOM
          const slots = shadow.querySelectorAll('slot');
          for (const slot of slots) {
            slot.addEventListener('slotchange', () => this.#attachMedia(), { signal: this.#slotAbort.signal });
          }
        }

        // Also try immediately in case elements are already present
        this.#attachMedia();
      }

      #attachMedia(): void {
        if (isNull(this.#store)) return;

        // Already attached
        if (this.#detach) return;

        const media = this.#findMediaElement();
        if (media) {
          this.#detach = this.#store.attach(media as UnionSliceTarget<Slices>);
        }
      }

      #findMediaElement(): HTMLMediaElement | null {
        const shadow = this.shadowRoot;

        if (shadow) {
          // Check slotted elements
          const slots = shadow.querySelectorAll('slot');
          for (const slot of slots) {
            for (const node of slot.assignedElements({ flatten: true })) {
              const media = this.#findMediaInNode(node);
              if (media) return media;
            }
          }
        }

        // Fallback to light DOM children
        for (const child of this.children) {
          const media = this.#findMediaInNode(child);
          if (media) return media;
        }

        return null;
      }

      #findMediaInNode(node: Element): HTMLMediaElement | null {
        if (node instanceof HTMLVideoElement || node instanceof HTMLAudioElement) {
          return node;
        }

        // Check descendants
        const media = node.querySelector('video, audio');
        return media as HTMLMediaElement | null;
      }
    } as TBase;
  };
}

// ----------------------------------------
// Combined Mixin
// ----------------------------------------

/**
 * Creates a combined mixin that both provides a store and auto-attaches media elements.
 *
 * Unlike composing `StoreAttachMixin(StoreProviderMixin(Base))`, this mixin properly
 * combines both behaviors without property conflicts.
 *
 * @param context - The context for the store
 * @param createStoreFn - Factory function to create the store instance
 *
 * @example
 * ```ts
 * const { StoreMixin } = createStore({ slices: [playbackSlice] });
 *
 * class MyPlayer extends StoreMixin(HTMLElement) {
 *   connectedCallback() {
 *     super.connectedCallback?.();
 *     this.attachShadow({ mode: 'open' });
 *     this.shadowRoot.innerHTML = '<slot></slot>';
 *   }
 * }
 *
 * // Usage:
 * // <my-player>
 * //   <video src="video.mp4"></video>
 * // </my-player>
 * ```
 */
export function createStoreMixin<Slices extends AnySlice[]>(
  context: Context<unknown, Store<UnionSliceTarget<Slices>, Slices>>,
  createStoreFn: () => Store<UnionSliceTarget<Slices>, Slices>,
): Mixin {
  type StoreType = Store<UnionSliceTarget<Slices>, Slices>;

  return <TBase extends Constructor<HTMLElement>>(Base: TBase): TBase => {
    return class StoreCombinedElement extends Base implements StoreProvider<Slices>, StoreAttacher<Slices> {
      #store: StoreType | null = null;
      #provider: ContextProvider<typeof context> | null = null;
      #isOwner = false;
      #detach: (() => void) | null = null;
      #slotAbort: AbortController | null = null;

      /**
       * Get the store instance, creating it if necessary.
       */
      get store(): StoreType {
        if (isNull(this.#store)) {
          this.#store = createStoreFn();
          this.#isOwner = true;
        }

        return this.#store;
      }

      /**
       * Set the store instance. Notifies all context consumers.
       */
      set store(newStore: StoreType) {
        const wasOwner = this.#isOwner;
        const oldStore = this.#store;

        this.#store = newStore;
        this.#isOwner = false;

        // Clean up old store if we owned it
        if (wasOwner && oldStore && oldStore !== newStore) {
          oldStore.destroy();
        }

        // Update provider if connected
        this.#provider?.setValue(newStore);
      }

      connectedCallback(): void {
        // @ts-expect-error - Base class may have connectedCallback
        super.connectedCallback?.();

        // Create provider with current store
        this.#provider = new ContextProvider(this, {
          context,
          initialValue: this.store,
        });

        // Set up slot change listener for auto-attach
        this.#observeSlots();
      }

      disconnectedCallback(): void {
        // @ts-expect-error - Base class may have disconnectedCallback
        super.disconnectedCallback?.();

        // Clean up slot listeners
        this.#slotAbort?.abort();
        this.#slotAbort = null;

        // Clean up media attachment
        this.#detach?.();
        this.#detach = null;

        // Destroy store if we created it
        if (this.#isOwner && this.#store) {
          this.#store.destroy();
          this.#store = null;
          this.#isOwner = false;
        }

        this.#provider = null;
      }

      #observeSlots(): void {
        this.#slotAbort = new AbortController();
        const shadow = this.shadowRoot;

        if (shadow) {
          // Observe slot changes in shadow DOM
          const slots = shadow.querySelectorAll('slot');
          for (const slot of slots) {
            slot.addEventListener('slotchange', () => this.#attachMedia(), { signal: this.#slotAbort.signal });
          }
        }

        // Also try immediately in case elements are already present
        this.#attachMedia();
      }

      #attachMedia(): void {
        // Already attached
        if (this.#detach) return;

        const media = this.#findMediaElement();
        if (media) {
          this.#detach = this.store.attach(media as UnionSliceTarget<Slices>);
        }
      }

      #findMediaElement(): HTMLMediaElement | null {
        const shadow = this.shadowRoot;

        if (shadow) {
          // Check slotted elements
          const slots = shadow.querySelectorAll('slot');
          for (const slot of slots) {
            for (const node of slot.assignedElements({ flatten: true })) {
              const media = this.#findMediaInNode(node);
              if (media) return media;
            }
          }
        }

        // Fallback to light DOM children
        for (const child of this.children) {
          const media = this.#findMediaInNode(child);
          if (media) return media;
        }

        return null;
      }

      #findMediaInNode(node: Element): HTMLMediaElement | null {
        if (node instanceof HTMLVideoElement || node instanceof HTMLAudioElement) {
          return node;
        }

        // Check descendants
        const media = node.querySelector('video, audio');
        return media as HTMLMediaElement | null;
      }
    } as TBase;
  };
}

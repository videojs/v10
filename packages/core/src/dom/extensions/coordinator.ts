import type { Media } from '@videojs/media';

import type { PlayerTarget } from '../player';
import type { PlayerExtension, PlayerExtensionConstructor } from './extension';
import { createPlayerMedia } from './media';

/**
 * Holds one extension per class for a player and keeps them attached to the player's current target.
 *
 * The player wraps its media with {@link PlayerExtensionCoordinator.wrap} before attaching the store, and re-attaches
 * the store whenever `onChange` fires so features re-read members an extension now owns (such as `remote`).
 */
export class PlayerExtensionCoordinator {
  readonly #extensions = new Map<PlayerExtensionConstructor, PlayerExtension>();
  readonly #onChange: () => void;
  #target: PlayerTarget | null = null;

  /** @param onChange - Called after an extension is registered or released. */
  constructor(onChange: () => void) {
    this.#onChange = onChange;
  }

  get size(): number {
    return this.#extensions.size;
  }

  get<T extends PlayerExtension>(Extension: PlayerExtensionConstructor<T>): T | undefined {
    return this.#extensions.get(Extension) as T | undefined;
  }

  /**
   * Register `extension`, replacing any earlier instance of the same class, and attach it to the current target.
   * Returns a release callback that only removes this exact instance.
   */
  register(extension: PlayerExtension): () => void {
    const Extension = extension.constructor as PlayerExtensionConstructor;
    const previous = this.#extensions.get(Extension);

    if (previous !== extension) {
      if (previous && this.#target) previous.detach?.();

      this.#extensions.set(Extension, extension);

      if (this.#target) extension.attach?.(this.#target);

      this.#onChange();
    }

    return () => this.#release(extension);
  }

  /** Attach every extension to `target`; a target with the same media and container is a no-op. */
  attach(target: PlayerTarget): void {
    if (this.#target?.media === target.media && this.#target?.container === target.container) return;

    this.detach();
    this.#target = target;

    for (const extension of this.#extensions.values()) {
      extension.attach?.(target);
    }
  }

  detach(): void {
    if (!this.#target) return;

    for (const extension of this.#extensions.values()) {
      extension.detach?.();
    }

    this.#target = null;
  }

  /** Detach and drop every registration. Extensions are destroyed by their owners, not here. */
  destroy(): void {
    this.detach();
    this.#extensions.clear();
  }

  /**
   * The media as the store should see it: `media` itself while no extension is registered, otherwise a facade that
   * routes each member through the registered extensions' overrides first.
   */
  wrap<T extends Media>(media: T): T {
    if (this.#extensions.size === 0) return media;

    return createPlayerMedia(media, () => this.#extensions.values());
  }

  #release(extension: PlayerExtension): void {
    const Extension = extension.constructor as PlayerExtensionConstructor;
    if (this.#extensions.get(Extension) !== extension) return;

    this.#extensions.delete(Extension);

    if (this.#target) extension.detach?.();

    this.#onChange();
  }
}

import type { PlayerTarget } from '../player';
import type { MediaOverrideSource } from './media';

/**
 * What the player tells an extension about itself, beyond the media it attaches.
 *
 * @internal
 */
export interface PlayerExtensionContext {
  /** Epoch milliseconds at which the player was created, before any extension or media existed. */
  readonly initTime: number;
}

/**
 * A player extension follows the player's attached media and may take over media members while it is active.
 *
 * Extensions are owned by whoever registers them (an element, a hook); the player only attaches and detaches them
 * alongside its store. `attach` receives the media the player resolved, never the facade the store sees, so an
 * extension can read the real state under its own overrides. It runs when the media changes, not when only the
 * container does.
 *
 * An extension that declares no `mediaOverride` is an observer (analytics, for example): registering it never wraps the
 * media the store sees or re-attaches the store.
 *
 * @internal
 */
export interface PlayerExtension extends MediaOverrideSource {
  attach?(target: PlayerTarget, player: PlayerExtensionContext): void;
  detach?(): void;
  destroy?(): void;
}

/** @internal */
export interface PlayerExtensionConstructor<T extends PlayerExtension = PlayerExtension> {
  new (...args: any[]): T;
}

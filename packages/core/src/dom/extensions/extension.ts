import type { PlayerTarget } from '../player';
import type { MediaOverrideSource } from './media';

/**
 * A player extension follows the player's attached media and may take over media members while it is active.
 *
 * Extensions are owned by whoever registers them (an element, a hook); the player only attaches and detaches them
 * alongside its store. `attach` receives the media the player resolved, never the facade the store sees, so an
 * extension can read the real state under its own overrides.
 */
export interface PlayerExtension extends MediaOverrideSource {
  attach?(target: PlayerTarget): void;
  detach?(): void;
  destroy?(): void;
}

export interface PlayerExtensionConstructor<T extends PlayerExtension = PlayerExtension> {
  new (...args: any[]): T;
}

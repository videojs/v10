import type { PlayerStore } from '@videojs/core/dom';
import type { MediaElementConstructor } from '@/ui/media-element';
import { createContainerMixin } from '../store/container-mixin';
import { createProviderMixin } from '../store/provider-mixin';
import type { PlayerProviderConstructor } from '../store/types';
import type { PlayerContext } from './context';

type Result<Class extends MediaElementConstructor, Store extends PlayerStore> = Class &
  PlayerProviderConstructor<Store>;

export type PlayerMixin<Store extends PlayerStore> = <Class extends MediaElementConstructor>(
  BaseClass: Class
) => Result<Class, Store>;

/**
 * Creates a mixin that combines provider and container functionality.
 *
 * Use for a complete player element that owns the store and attaches media.
 */
export function createPlayerMixin<Store extends PlayerStore>(
  context: PlayerContext<Store>,
  factory: () => Store
): PlayerMixin<Store> {
  const ProviderMixin = createProviderMixin<Store>(context, factory);
  const ContainerMixin = createContainerMixin<Store>(context);

  return <Class extends MediaElementConstructor>(BaseClass: Class) => {
    return ContainerMixin(ProviderMixin(BaseClass)) as unknown as Result<Class, Store>;
  };
}

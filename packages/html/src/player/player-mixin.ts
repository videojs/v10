import type { ReactiveElement } from '@lit/reactive-element';
import type { PlayerStore } from '@videojs/core/dom';
import type { Constructor } from '@videojs/utils/types';

import { createContainerMixin } from '../store/container-mixin';
import { createProviderMixin } from '../store/provider-mixin';
import type { PlayerProvider } from '../store/types';
import type { PlayerContext } from './context';

export interface PlayerElement<Store extends PlayerStore> extends PlayerProvider<Store> {}

type Base = Constructor<ReactiveElement>;

type Result<Class extends Base, Store extends PlayerStore> = Class & PlayerElement<Store>;

export type PlayerMixin<Store extends PlayerStore> = <Class extends Base>(BaseClass: Class) => Result<Class, Store>;

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

  return <Class extends Base>(BaseClass: Class) => {
    return ContainerMixin(ProviderMixin(BaseClass)) as unknown as Result<Class, Store>;
  };
}
